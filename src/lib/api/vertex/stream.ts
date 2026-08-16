import { getStreamQueryUrl } from './env';
import { getAuthToken } from './auth';
import type { Citation } from '@/types';

export type AgentEvent =
  | { type: 'text'; delta: string }
  | { type: 'citations'; citations: Citation[] }
  | { type: 'session'; sessionId: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export interface AgentQueryInput {
  userId: string;
  message: string;
  sessionId?: string;
}

export async function* streamAgentQuery(
  input: AgentQueryInput,
): AsyncGenerator<AgentEvent> {
  const token = await getAuthToken();
  const url = getStreamQueryUrl();

  const body = JSON.stringify({
    classMethod: 'stream_query',
    input: {
      user_id: input.userId,
      message: input.message,
      ...(input.sessionId ? { session_id: input.sessionId } : {}),
    },
  });

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body,
  });

  if (!resp.ok || !resp.body) {
    yield { type: 'error', message: `Vertex streamQuery failed: ${resp.status} ${resp.statusText}` };
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // NDJSON: one JSON object per \n. Handle both \n and \r\n line endings.
      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).replace(/\r$/, '');
        buffer = buffer.slice(idx + 1);
        if (!line.trim()) continue;
        let parsed: unknown;
        try { parsed = JSON.parse(line); } catch { continue; }
        const text = extractText(parsed);
        if (text) yield { type: 'text', delta: text };
        const sessionId = extractSessionId(parsed);
        if (sessionId) yield { type: 'session', sessionId };
        const citations = extractCitations(parsed);
        if (citations.length > 0) yield { type: 'citations', citations };
      }
    }
    // Drain the decoder of any bytes held back mid-multi-byte sequence (streaming mode).
    buffer += decoder.decode();
    // Flush trailing partial line if the stream ended without a newline.
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer);
        const text = extractText(parsed);
        if (text) yield { type: 'text', delta: text };
        const sessionId = extractSessionId(parsed);
        if (sessionId) yield { type: 'session', sessionId };
        const citations = extractCitations(parsed);
        if (citations.length > 0) yield { type: 'citations', citations };
      } catch { /* ignore */ }
    }
  } finally {
    reader.releaseLock();
  }

  yield { type: 'done' };
}

function extractText(event: unknown): string {
  // event.content.parts[].text
  if (!event || typeof event !== 'object') return '';
  const content = (event as { content?: unknown }).content;
  if (!content || typeof content !== 'object') return '';
  const parts = (content as { parts?: unknown }).parts;
  if (!Array.isArray(parts)) return '';
  let out = '';
  for (const p of parts) {
    if (p && typeof p === 'object' && 'text' in p && typeof (p as { text: unknown }).text === 'string') {
      out += (p as { text: string }).text;
    }
  }
  return out;
}

function extractSessionId(event: unknown): string | undefined {
  // Vertex emits per-turn id (UUID) in top-level "id" field
  if (!event || typeof event !== 'object') return undefined;
  const id = (event as { id?: unknown }).id;
  return typeof id === 'string' ? id : undefined;
}

// Citation marker emitted by the agent's RAG tool (medaid_advisor_agent/agent.py):
//   Source: <filename>
//   Source URI: gs://bucket/path/file.pdf
//   Download: https://base/download?uri=<url-encoded gs uri>
const CITATION_BLOCK_RE =
  /Source:\s*([^\n]+)\nSource URI:\s*(\S+)\nDownload:\s*(\S+)/g;

function extractCitations(event: unknown): Citation[] {
  if (!event || typeof event !== 'object') return [];
  const content = (event as { content?: unknown }).content;
  if (!content || typeof content !== 'object') return [];
  const parts = (content as { parts?: unknown }).parts;
  if (!Array.isArray(parts)) return [];

  const citations: Citation[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    if (!p || typeof p !== 'object') continue;
    const fr = (p as { function_response?: unknown }).function_response;
    if (!fr || typeof fr !== 'object') continue;
    const response = (fr as { response?: unknown }).response;
    if (!response || typeof response !== 'object') continue;
    const result = (response as { result?: unknown }).result;
    if (typeof result !== 'string') continue;

    CITATION_BLOCK_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = CITATION_BLOCK_RE.exec(result)) !== null) {
      const title = match[1].trim();
      const uri = match[2];
      const url = match[3];
      if (seen.has(url)) continue;
      seen.add(url);
      citations.push({ title, url, uri });
    }
  }
  return citations;
}

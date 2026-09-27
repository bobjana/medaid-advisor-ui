import { getStreamQueryUrl } from './env';
import { getAuthToken } from './auth';
import { ensureSessionId } from './sessions';
import { extractCitations, extractContextOptions, extractError, extractText } from '../adk/parse';
import type { AgentEvent } from '../adk/events';

export type { AgentEvent } from '../adk/events';

export interface AgentQueryInput {
  userId: string;
  message: string;
  sessionId?: string;
}

export async function* streamAgentQuery(
  input: AgentQueryInput,
): AsyncGenerator<AgentEvent> {
  const sessionId = await ensureSessionId(input.userId, input.sessionId);
  yield { type: 'session', sessionId };

  const token = await getAuthToken();
  const url = getStreamQueryUrl();

  const body = JSON.stringify({
    classMethod: 'stream_query',
    input: {
      user_id: input.userId,
      message: input.message,
      session_id: sessionId,
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

      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).replace(/\r$/, '');
        buffer = buffer.slice(idx + 1);
        if (!line.trim()) continue;
        let parsed: unknown;
        try { parsed = JSON.parse(line); } catch { continue; }
        const error = extractError(parsed);
        if (error) { yield { type: 'error', message: error }; continue; }
        const text = extractText(parsed);
        if (text) yield { type: 'text', delta: text };
        const citations = extractCitations(parsed);
        if (citations.length > 0) yield { type: 'citations', citations };
        const options = extractContextOptions(parsed);
        if (options) yield { type: 'context_options', options };
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer);
        const error = extractError(parsed);
        if (error) {
          yield { type: 'error', message: error };
        } else {
          const text = extractText(parsed);
          if (text) yield { type: 'text', delta: text };
          const citations = extractCitations(parsed);
          if (citations.length > 0) yield { type: 'citations', citations };
          const options = extractContextOptions(parsed);
          if (options) yield { type: 'context_options', options };
        }
      } catch { /* ignore */ }
    }
  } finally {
    reader.releaseLock();
  }

  yield { type: 'done' };
}


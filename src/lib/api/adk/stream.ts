import { getLocalBackendUrl } from '../backend';
import { randomUUID } from '@/lib/utils';
import { createLocalSession } from './client';
import { extractCitations, extractContextOptions, extractError, extractText } from './parse';
import type { AgentEvent } from './events';

export interface AdkQueryInput {
  userId: string;
  message: string;
  sessionId?: string;
}

function* emitEvent(event: unknown): Generator<AgentEvent> {
  // Runtime failures arrive in-band; surface them instead of dropping them.
  const error = extractError(event);
  if (error) {
    yield { type: 'error', message: error };
    return;
  }
  const text = extractText(event);
  if (text) yield { type: 'text', delta: text };
  const citations = extractCitations(event);
  if (citations.length > 0) yield { type: 'citations', citations };
  const options = extractContextOptions(event);
  if (options) yield { type: 'context_options', options };
}

function parseSseBlock(block: string): unknown[] {
  const events: unknown[] = [];
  for (const line of block.split('\n')) {
    if (line.startsWith('data:')) {
      const payload = line.slice(5).trim();
      if (!payload) continue;
      try {
        events.push(JSON.parse(payload));
      } catch { /* ignore malformed JSON */ }
      break;
    }
  }
  return events;
}

export async function* streamAdkQuery(
  input: AdkQueryInput,
): AsyncGenerator<AgentEvent> {
  let sessionId = input.sessionId ?? `s-${randomUUID()}`;
  try {
    await createLocalSession(input.userId, sessionId);
  } catch (err) {
    yield { type: 'error', message: (err as Error).message };
    return;
  }
  yield { type: 'session', sessionId };

  const runUrl = `${getLocalBackendUrl()}/run_sse`;
  const body = JSON.stringify({
    userId: input.userId,
    sessionId,
    newMessage: { role: 'user', parts: [{ text: input.message }] },
    streaming: true,
  });

  const doRun = () =>
    fetch(runUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

  let resp = await doRun();
  if (resp.status === 404) {
    sessionId = `s-${randomUUID()}`;
    await createLocalSession(input.userId, sessionId);
    yield { type: 'session', sessionId };
    resp = await doRun();
  }

  if (!resp.ok || !resp.body) {
    const detail = await resp.text().catch(() => '');
    yield {
      type: 'error',
      message: `ADK streamQuery failed: ${resp.status} ${resp.statusText}${detail ? ` — ${detail}` : ''}`,
    };
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
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        for (const ev of parseSseBlock(block)) {
          yield* emitEvent(ev);
        }
      }
    }
    buffer += decoder.decode();
    for (const ev of parseSseBlock(buffer)) {
      yield* emitEvent(ev);
    }
  } finally {
    reader.releaseLock();
  }

  yield { type: 'done' };
}

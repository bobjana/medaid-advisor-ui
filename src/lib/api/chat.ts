import type { ChatEvent, ChatRequest } from '@/types';
import { randomUUID } from '@/lib/utils';

export function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return 'server';
  const key = 'medaid:user-id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export interface ChatContextInput {
  sessionId?: string;
  /** Scheme slug (e.g. `bonitas`), or `null` for "all schemes". */
  scheme: string | null;
  /** Plan id (e.g. `boncomplete`), or `null` for scheme-wide. */
  plan: string | null;
}

export interface ChatContextResult {
  sessionId?: string;
}

/**
 * Set (or clear) the agent-side scheme/plan context without adding a chat
 * turn. Returns the session id when the backend had to create one.
 */
export async function setChatContext(input: ChatContextInput): Promise<ChatContextResult> {
  const resp = await fetch('/api/chat/context', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': getOrCreateUserId(),
    },
    body: JSON.stringify(input),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(
      `Context update failed: ${resp.status}${detail ? ` — ${detail}` : ''}`,
    );
  }
  return (await resp.json().catch(() => ({}))) as ChatContextResult;
}

export async function* streamMessage(req: ChatRequest): AsyncGenerator<ChatEvent> {
  const resp = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': getOrCreateUserId() },
    body: JSON.stringify(req),
  });
  if (!resp.ok || !resp.body) throw new Error(`Chat failed: ${resp.status}`);

  const reader = resp.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;

      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).replace(/\r$/, '');
        buffer = buffer.slice(idx + 1);
        if (!line.trim()) continue;
        let parsed: unknown;
        try {
          parsed = JSON.parse(line);
        } catch {
          continue;
        }
        yield parsed as ChatEvent;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

import type { ChatEvent, ChatRequest } from '@/types';

function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return 'server';
  const key = 'medaid:user-id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
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

import type { ChatRequest } from '@/types';

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

export async function streamMessage(
  req: ChatRequest,
): Promise<ReadableStream<string>> {
  const resp = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': getOrCreateUserId() },
    body: JSON.stringify(req),
  });
  if (!resp.ok || !resp.body) throw new Error(`Chat failed: ${resp.status}`);
  return resp.body!.pipeThrough(new TextDecoderStream());
}
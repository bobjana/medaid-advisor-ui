import { describe, it, expect, vi, afterEach } from 'vitest';
import { streamMessage } from './chat';
import type { ChatEvent, ChatRequest } from '@/types';

afterEach(() => {
  vi.restoreAllMocks();
});

function ndjsonStream(lines: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(lines.join('\n') + '\n'));
      controller.close();
    },
  });
}

async function collectEvents(req: ChatRequest): Promise<ChatEvent[]> {
  const events: ChatEvent[] = [];
  for await (const ev of streamMessage(req)) events.push(ev);
  return events;
}

describe('streamMessage', () => {
  it('POSTs to /api/chat and parses NDJSON events', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: ndjsonStream([
        JSON.stringify({ type: 'text', delta: 'hello' }),
        JSON.stringify({ type: 'done' }),
      ]),
    });
    globalThis.fetch = fetchMock;

    const events = await collectEvents({ message: 'hello' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/chat');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers['x-user-id']).toBeDefined();
    expect(JSON.parse(init.body)).toEqual({ message: 'hello' });

    expect(events).toEqual([
      { type: 'text', delta: 'hello' },
      { type: 'done' },
    ]);
  });

  it('forwards the sessionId in the request body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: ndjsonStream([]),
    });
    globalThis.fetch = fetchMock;

    await collectEvents({ message: 'follow up', sessionId: 's-1' });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ message: 'follow up', sessionId: 's-1' });
  });

  it('throws when response is not OK', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      body: null,
    });

    const gen = streamMessage({ message: 'test' });
    await expect(gen.next()).rejects.toThrow('Chat failed: 500');
  });

  it('parses citation events', async () => {
    const citation = {
      title: 'plan.pdf',
      url: 'https://host/download?uri=gs%3A%2F%2Fb%2Fplan.pdf',
      uri: 'gs://b/plan.pdf',
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: ndjsonStream([
        JSON.stringify({ type: 'citations', citations: [citation] }),
        JSON.stringify({ type: 'done' }),
      ]),
    });

    const events = await collectEvents({ message: 'hello' });

    expect(events).toEqual([
      { type: 'citations', citations: [citation] },
      { type: 'done' },
    ]);
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { streamMessage } from './chat';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('streamMessage', () => {
  it('POSTs to /api/chat with message and x-user-id header, returns a string stream', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('hello'));
        controller.close();
      },
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
    });
    globalThis.fetch = fetchMock;

    const result = await streamMessage({ message: 'hello' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/chat');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers['x-user-id']).toBeDefined();
    expect(JSON.parse(init.body)).toEqual({ message: 'hello' });

    const reader = result.getReader();
    const chunks: string[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    expect(chunks.join('')).toBe('hello');
  });

  it('forwards the sessionId in the request body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.close();
        },
      }),
    });
    globalThis.fetch = fetchMock;

    await streamMessage({ message: 'follow up', sessionId: 's-1' });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ message: 'follow up', sessionId: 's-1' });
  });

  it('throws when response is not OK', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      body: null,
    });

    await expect(streamMessage({ message: 'test' })).rejects.toThrow('Chat failed: 500');
  });
});

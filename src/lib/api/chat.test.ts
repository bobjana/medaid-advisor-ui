import { describe, it, expect, vi, afterEach } from 'vitest';
import { sendMessage } from './chat';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('sendMessage', () => {
  it('POSTs the message to /chat with a JSON body and returns the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: 'hi there', sessionId: 's-1' }),
    });
    globalThis.fetch = fetchMock;

    const result = await sendMessage({ message: 'hello' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8080/chat');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ message: 'hello' });
    expect(result).toEqual({ response: 'hi there', sessionId: 's-1' });
  });

  it('forwards an existing sessionId in the request body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: 'ok' }),
    });
    globalThis.fetch = fetchMock;

    await sendMessage({ message: 'follow up', sessionId: 's-1' });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ message: 'follow up', sessionId: 's-1' });
  });

  it('propagates ApiError from the underlying client', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    });

    await expect(sendMessage({ message: 'x' })).rejects.toMatchObject({
      status: 503,
      statusText: 'Service Unavailable',
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { streamMessage, setChatContext } from './chat';
import type { ChatEvent, ChatRequest } from '@/types';

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((k: string) => store[k] ?? null),
  setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
  removeItem: vi.fn((k: string) => { delete store[k]; }),
  clear: vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
  get length() { return Object.keys(store).length; },
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
};

let originalLocalStorage: typeof globalThis.localStorage | undefined;

beforeEach(() => {
  originalLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true, configurable: true });
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  Object.keys(store).forEach((k) => delete store[k]);
});

afterEach(() => {
  if (originalLocalStorage !== undefined) {
    Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, writable: true, configurable: true });
  }
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

  it('surfaces the response body detail when the chat request is rejected', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      body: null,
      text: () => Promise.resolve('RESOURCE_EXHAUSTED: quota exceeded'),
    });

    const gen = streamMessage({ message: 'test' });
    await expect(gen.next()).rejects.toThrow('Chat failed: 429 — RESOURCE_EXHAUSTED: quota exceeded');
  });

  it('aborts with a stall error when the stream stops sending events', async () => {
    const stalled = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(JSON.stringify({ type: 'text', delta: 'hi' }) + '\n'),
        );
        // The stream never closes — the backend hangs.
      },
    });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, body: stalled });

    const events: ChatEvent[] = [];
    await expect(async () => {
      for await (const ev of streamMessage({ message: 'test' }, { stallTimeoutMs: 25 })) {
        events.push(ev);
      }
    }).rejects.toThrow(/stalled/);
    expect(events).toEqual([{ type: 'text', delta: 'hi' }]);
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

describe('setChatContext', () => {
  it('POSTs the context to /api/chat/context and returns the session id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, sessionId: 's-9' }),
    });
    globalThis.fetch = fetchMock;

    const result = await setChatContext({ scheme: 'bonitas', plan: 'boncomplete' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/chat/context');
    expect(init.method).toBe('POST');
    expect(init.headers['x-user-id']).toBeDefined();
    expect(JSON.parse(init.body)).toEqual({ scheme: 'bonitas', plan: 'boncomplete' });
    expect(result).toEqual({ ok: true, sessionId: 's-9' });
  });

  it('forwards the sessionId, including on clear', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
    globalThis.fetch = fetchMock;

    await setChatContext({ sessionId: 's-1', scheme: null, plan: null });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      sessionId: 's-1',
      scheme: null,
      plan: null,
    });
  });

  it('throws on a non-OK response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: () => Promise.resolve('boom'),
    });

    await expect(setChatContext({ scheme: 'bonitas', plan: null })).rejects.toThrow(
      /Context update failed: 502/,
    );
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { streamAdkQuery } from './stream';
import type { AgentEvent } from './events';

function sseResponse(events: unknown[]): Response {
  const data = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(data));
      controller.close();
    },
  });
  return { ok: true, status: 200, statusText: 'OK', body: stream } as unknown as Response;
}

function okResponse(): Response {
  return { ok: true, status: 200, statusText: 'OK' } as unknown as Response;
}

async function collectEvents(): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const ev of streamAdkQuery({ userId: 'u', message: 'hi', sessionId: 's-local' })) {
    events.push(ev);
  }
  return events;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('streamAdkQuery (local ADK backend)', () => {
  it('surfaces in-band error payloads as error events', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: unknown) => {
      if (String(url).includes('/sessions')) return okResponse();
      return sseResponse([
        { error_code: 'ClientError', error_message: '404 NOT_FOUND. model not found' },
      ]);
    });

    const events = await collectEvents();

    expect(events.filter((e) => e.type === 'error')).toEqual([
      { type: 'error', message: 'ClientError: 404 NOT_FOUND. model not found' },
    ]);
    expect(events.filter((e) => e.type === 'text')).toHaveLength(0);
  });

  it('keeps emitting text for normal events', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: unknown) => {
      if (String(url).includes('/sessions')) return okResponse();
      return sseResponse([{ content: { parts: [{ text: 'hello' }] } }]);
    });

    const events = await collectEvents();

    expect(events.filter((e) => e.type === 'text')).toEqual([{ type: 'text', delta: 'hello' }]);
    expect(events.filter((e) => e.type === 'error')).toHaveLength(0);
  });

  it('emits a session event before streaming', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: unknown) => {
      if (String(url).includes('/sessions')) return okResponse();
      return sseResponse([{ content: { parts: [{ text: 'hi' }] } }]);
    });

    const events = await collectEvents();

    expect(events[0]).toEqual({ type: 'session', sessionId: 's-local' });
    expect(events[events.length - 1]).toEqual({ type: 'done' });
  });
});

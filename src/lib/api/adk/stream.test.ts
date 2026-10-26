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

async function collectEvents(input?: Parameters<typeof streamAdkQuery>[0], opts?: Parameters<typeof streamAdkQuery>[1]): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const ev of streamAdkQuery(
    input ?? { userId: 'u', message: 'hi', sessionId: 's-local' },
    opts,
  )) {
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

  it('emits the agent context state from a state delta', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: unknown) => {
      if (String(url).includes('/sessions')) return okResponse();
      return sseResponse([
        { actions: { state_delta: { selected_scheme: 'bonitas', selected_plan: 'boncomplete' } } },
        { content: { parts: [{ text: 'ok' }] } },
      ]);
    });

    const events = await collectEvents();

    expect(events.filter((e) => e.type === 'context_state')).toEqual([
      { type: 'context_state', state: { scheme: 'bonitas', plan: 'boncomplete' } },
    ]);
  });

  it('targets the provided baseUrl for session creation and run_sse', async () => {
    const urls: string[] = [];
    globalThis.fetch = vi.fn().mockImplementation(async (url: unknown) => {
      urls.push(String(url));
      if (String(url).includes('/sessions')) return okResponse();
      return sseResponse([{ content: { parts: [{ text: 'hello' }] } }]);
    });

    const events = await collectEvents(undefined, { baseUrl: 'http://py:9000' });

    expect(events.filter((e) => e.type === 'text')).toEqual([{ type: 'text', delta: 'hello' }]);
    expect(urls.some((u) => u.startsWith('http://py:9000/apps/'))).toBe(true);
    expect(urls).toContain('http://py:9000/run_sse');
    expect(urls.some((u) => u.startsWith('http://localhost'))).toBe(false);
  });

  it('recreates the session on the provided baseUrl after a 404 turn', async () => {
    const urls: string[] = [];
    let runCalls = 0;
    globalThis.fetch = vi.fn().mockImplementation(async (url: unknown) => {
      urls.push(String(url));
      if (String(url).endsWith('/run_sse')) {
        runCalls += 1;
        if (runCalls === 1) {
          return {
            ok: false,
            status: 404,
            statusText: 'Not Found',
            body: null,
            text: async () => 'Session not found',
          } as unknown as Response;
        }
      }
      if (String(url).includes('/sessions')) return okResponse();
      return sseResponse([{ content: { parts: [{ text: 'recovered' }] } }]);
    });

    const events = await collectEvents(undefined, { baseUrl: 'http://py:9000' });

    expect(events.filter((e) => e.type === 'text')).toEqual([{ type: 'text', delta: 'recovered' }]);
    // Two session creations (original + post-404), both against the override.
    const sessionUrls = urls.filter((u) => u.includes('/sessions'));
    expect(sessionUrls).toHaveLength(2);
    expect(sessionUrls.every((u) => u.startsWith('http://py:9000/'))).toBe(true);
  });
});

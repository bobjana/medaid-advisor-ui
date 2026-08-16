import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { streamAgentQuery } from './vertex/stream';
import { setAuthProvider } from './vertex/auth';
import type { AgentEvent, AgentQueryInput } from './vertex/stream';

const FIXTURE_PATH = join(__dirname, 'vertex', '__fixtures__', 'stream-sample.ndjson');
const fixtureExists = existsSync(FIXTURE_PATH);

// streamAgentQuery reads these eagerly on every call — provide stable values
// so tests exercise the parser, not the environment loader.
beforeAll(() => {
  process.env.VERTEX_PROJECT = 'test-project';
  process.env.VERTEX_REGION = 'us-central1';
  process.env.AGENT_ENGINE_ID = 'test-engine';
  setAuthProvider({ getToken: async () => 'test-token' });
});

afterAll(() => {
  delete process.env.VERTEX_PROJECT;
  delete process.env.VERTEX_REGION;
  delete process.env.AGENT_ENGINE_ID;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function ndjsonResponse(
  lines: string[],
  opts: { ok?: boolean; status?: number; statusText?: string } = {},
): Response {
  const data = lines.join('\n') + '\n';
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(data));
      controller.close();
    },
  });
  return {
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    statusText: opts.statusText ?? 'OK',
    body: stream,
  } as unknown as Response;
}

async function collectEvents(input: AgentQueryInput = { userId: 'test-user', message: 'hello' }): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const ev of streamAgentQuery(input)) {
    events.push(ev);
  }
  return events;
}

describe.skipIf(!fixtureExists)('streamAgentQuery with real fixture', () => {
  let fixtureLines: string[];

  beforeAll(() => {
    fixtureLines = readFileSync(FIXTURE_PATH, 'utf-8').split('\n').filter((l) => l.trim());
  });

  it('extracts text from content.parts[0].text', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(ndjsonResponse(fixtureLines));

    const events = await collectEvents();

    const textEvents = events.filter((e) => e.type === 'text');
    expect(textEvents.length).toBeGreaterThan(0);
    expect(textEvents[0].delta.length).toBeGreaterThan(0);

    expect(events[events.length - 1]).toEqual({ type: 'done' });
  });

  it('parses the full real stream: non-text events skipped, session + text + done emitted', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(ndjsonResponse(fixtureLines));

    const events = await collectEvents();

    const text = events
      .filter((e) => e.type === 'text')
      .map((e) => (e as { type: 'text'; delta: string }).delta)
      .join('');
    expect(text.length).toBeGreaterThan(0);

    const sessionEvents = events.filter((e) => e.type === 'session');
    expect(sessionEvents.length).toBeGreaterThan(0);

    expect(events[events.length - 1]).toEqual({ type: 'done' });
  });
});

describe('streamAgentQuery NDJSON parsing', () => {
  it('concatenates text from multi-part events', async () => {
    const line = JSON.stringify({ content: { parts: [{ text: 'Hello ' }, { text: 'world' }] } });
    globalThis.fetch = vi.fn().mockResolvedValue(ndjsonResponse([line]));

    const events = await collectEvents();

    const textEvents = events.filter((e) => e.type === 'text');
    expect(textEvents).toHaveLength(1);
    expect(textEvents[0]).toEqual({ type: 'text', delta: 'Hello world' });
    expect(events[events.length - 1]).toEqual({ type: 'done' });
  });

  it('handles \\r\\n line endings', async () => {
    const line = JSON.stringify({ content: { parts: [{ text: 'CRLF ok' }] } });
    const data = line + '\r\n' + line + '\r\n';
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(data));
        controller.close();
      },
    });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK', body: stream });

    const events = await collectEvents();

    const textDeltas = events.filter((e) => e.type === 'text').map((e) => (e as { delta: string }).delta);
    expect(textDeltas).toEqual(['CRLF ok', 'CRLF ok']);
    expect(events[events.length - 1]).toEqual({ type: 'done' });
  });

  it('ignores empty lines', async () => {
    const line = JSON.stringify({ content: { parts: [{ text: 'x' }] } });
    const data = '\n\n' + line + '\n\n';
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(data));
        controller.close();
      },
    });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK', body: stream });

    const events = await collectEvents();

    const textEvents = events.filter((e) => e.type === 'text');
    expect(textEvents).toHaveLength(1);
    expect(events[events.length - 1]).toEqual({ type: 'done' });
  });

  it('flushes a trailing partial line that ends without a newline', async () => {
    const line = JSON.stringify({ content: { parts: [{ text: 'tail' }] } });
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(line));
        controller.close();
      },
    });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK', body: stream });

    const events = await collectEvents();

    const textEvents = events.filter((e) => e.type === 'text');
    expect(textEvents).toHaveLength(1);
    expect(textEvents[0]).toEqual({ type: 'text', delta: 'tail' });
  });

  it('skips malformed JSON lines instead of crashing', async () => {
    const good = JSON.stringify({ content: { parts: [{ text: 'ok' }] } });
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('this is not json\n' + good + '\n'));
        controller.close();
      },
    });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK', body: stream });

    const events = await collectEvents();

    const textEvents = events.filter((e) => e.type === 'text');
    expect(textEvents).toHaveLength(1);
    expect(textEvents[0]).toEqual({ type: 'text', delta: 'ok' });
  });

  it('decodes a multi-byte UTF-8 character split across chunks', async () => {
    const text = 'héllo — wörld ☺';
    const line = JSON.stringify({ content: { parts: [{ text }] } });
    const bytes = new TextEncoder().encode(line);
    const half = Math.floor(bytes.length / 2);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, half));
        controller.enqueue(bytes.slice(half));
        controller.close();
      },
    });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK', body: stream });

    const events = await collectEvents();

    const textEvents = events.filter((e) => e.type === 'text');
    expect(textEvents).toHaveLength(1);
    expect(textEvents[0]).toEqual({ type: 'text', delta: text });
  });
});

describe('streamAgentQuery error handling', () => {
  it('emits an error event on a non-OK response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      body: null,
    });

    const events = await collectEvents();

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'error', message: expect.stringContaining('500') });
    expect(events[0]).toEqual({ type: 'error', message: expect.stringContaining('Internal Server Error') });
  });

  it('emits an error event when an OK response has no body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      body: null,
    });

    const events = await collectEvents();

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('error');
    expect((events[0] as { message: string }).message).toContain('200');
  });
});

describe('streamAgentQuery citation extraction', () => {
  it('extracts citations from a function_response result', async () => {
    const result =
      '[Excerpt 1]\nSource: discovery-keycare-plan-guide.pdf\n' +
      'Source URI: gs://bucket/plans/discovery-keycare-plan-guide.pdf\n' +
      'Download: https://host/download?uri=gs%3A%2F%2Fbucket%2Fplans%2Fdiscovery-keycare-plan-guide.pdf\n\n' +
      'Unlimited hospital cover in KeyCare networks.';
    const line = JSON.stringify({
      content: { parts: [{ function_response: { name: 'search_discovery_benefits', response: { result } } }] },
    });
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(line + '\n'));
        controller.close();
      },
    });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK', body: stream });

    const events = await collectEvents();

    const citationEvents = events.filter((e) => e.type === 'citations');
    expect(citationEvents).toHaveLength(1);
    expect(citationEvents[0]).toEqual({
      type: 'citations',
      citations: [
        {
          title: 'discovery-keycare-plan-guide.pdf',
          uri: 'gs://bucket/plans/discovery-keycare-plan-guide.pdf',
          url: 'https://host/download?uri=gs%3A%2F%2Fbucket%2Fplans%2Fdiscovery-keycare-plan-guide.pdf',
        },
      ],
    });
  });

  it('deduplicates repeated citation URLs', async () => {
    const block =
      'Source: plan.pdf\nSource URI: gs://b/plan.pdf\nDownload: https://host/d?uri=x\n\n';
    const result = block + '---\n' + block;
    const line = JSON.stringify({
      content: { parts: [{ function_response: { response: { result } } }] },
    });
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(line + '\n'));
        controller.close();
      },
    });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK', body: stream });

    const events = await collectEvents();

    const citationEvents = events.filter((e) => e.type === 'citations');
    expect(citationEvents).toHaveLength(1);
    expect((citationEvents[0] as { citations: unknown[] }).citations).toHaveLength(1);
  });
});

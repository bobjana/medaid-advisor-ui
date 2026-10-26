import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ChatEvent, ChatRequest } from '@/types';
import type { AgentEvent } from './adk/events';

vi.mock('./adk/stream', () => ({ streamAdkQuery: vi.fn() }));
vi.mock('./vertex/stream', () => ({ streamAgentQuery: vi.fn() }));

import { streamChat } from './chat-stream';
import { streamAdkQuery } from './adk/stream';
import { streamAgentQuery } from './vertex/stream';

const adkQueryMock = vi.mocked(streamAdkQuery);
const vertexQueryMock = vi.mocked(streamAgentQuery);

const savedEnv = new Map<string, string | undefined>();

function setEnv(key: string, value: string | undefined): void {
  if (!savedEnv.has(key)) savedEnv.set(key, process.env[key]);
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

async function collect(req: ChatRequest, userId = 'u1'): Promise<ChatEvent[]> {
  const reader = streamChat(req, userId).getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const events: ChatEvent[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (line) events.push(JSON.parse(line) as ChatEvent);
    }
  }
  return events;
}

function agentStream(events: AgentEvent[]): AsyncGenerator<AgentEvent> {
  return (async function* () {
    for (const ev of events) yield ev;
  })();
}

describe('streamChat backend routing', () => {
  beforeEach(() => {
    adkQueryMock.mockReset();
    vertexQueryMock.mockReset();
    setEnv('CHAT_BACKEND', 'gcp');
    setEnv('NEXT_PUBLIC_API_BASE_URL', 'http://adk:7001');
    setEnv('PYTHON_BACKEND_URL', 'http://py:9000');
    adkQueryMock.mockReturnValue(agentStream([{ type: 'text', delta: 'hi' }, { type: 'done' }]));
    vertexQueryMock.mockReturnValue(agentStream([{ type: 'text', delta: 'hi' }, { type: 'done' }]));
  });

  afterEach(() => {
    for (const [key, value] of savedEnv) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
      savedEnv.delete(key);
    }
  });

  it("routes 'adk' to the ADK server URL", async () => {
    const events = await collect({ message: 'hi', backend: 'adk' });

    expect(vertexQueryMock).not.toHaveBeenCalled();
    expect(adkQueryMock).toHaveBeenCalledWith(
      { userId: 'u1', message: 'hi', sessionId: undefined },
      { baseUrl: 'http://adk:7001' },
    );
    expect(events).toEqual([
      { type: 'text', delta: 'hi' },
      { type: 'done' },
    ]);
  });

  it("routes 'python' to the python parity server URL", async () => {
    await collect({ message: 'hi', backend: 'python' });

    expect(vertexQueryMock).not.toHaveBeenCalled();
    expect(adkQueryMock).toHaveBeenCalledWith(
      { userId: 'u1', message: 'hi', sessionId: undefined },
      { baseUrl: 'http://py:9000' },
    );
  });

  it('keeps the explicit backend selection when a session id is supplied', async () => {
    await collect({ message: 'hi', sessionId: 's-1', backend: 'python' });

    expect(adkQueryMock).toHaveBeenCalledWith(
      { userId: 'u1', message: 'hi', sessionId: 's-1' },
      { baseUrl: 'http://py:9000' },
    );
  });

  it('falls back to the env backend when no selection is sent (local → ADK server)', async () => {
    setEnv('CHAT_BACKEND', 'local');

    await collect({ message: 'hi' });

    expect(vertexQueryMock).not.toHaveBeenCalled();
    expect(adkQueryMock).toHaveBeenCalledWith({ userId: 'u1', message: 'hi', sessionId: undefined });
  });

  it('falls back to the env backend when no selection is sent (gcp → Vertex)', async () => {
    await collect({ message: 'hi' });

    expect(adkQueryMock).not.toHaveBeenCalled();
    expect(vertexQueryMock).toHaveBeenCalledWith({
      userId: 'u1',
      message: 'hi',
      sessionId: undefined,
    });
  });

  it('treats an unknown backend value as no selection', async () => {
    await collect({ message: 'hi', backend: 'vertex' as ChatRequest['backend'] });

    expect(adkQueryMock).not.toHaveBeenCalled();
    expect(vertexQueryMock).toHaveBeenCalledTimes(1);
  });
});

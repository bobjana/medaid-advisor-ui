import type { ChatEvent, ChatRequest } from '@/types';
import type { AgentBackend } from './backend';
import { randomUUID } from '@/lib/utils';

export function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return 'server';
  const key = 'medaid:user-id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export interface ChatContextInput {
  sessionId?: string;
  /** Agent backend the session lives on (see ChatRequest.backend). */
  backend?: AgentBackend;
  /** Scheme slug (e.g. `bonitas`), or `null` for "all schemes". */
  scheme: string | null;
  /** Plan id (e.g. `boncomplete`), or `null` for scheme-wide. */
  plan: string | null;
}

export interface ChatContextResult {
  sessionId?: string;
}

/**
 * Set (or clear) the agent-side scheme/plan context without adding a chat
 * turn. Returns the session id when the backend had to create one.
 */
export async function setChatContext(input: ChatContextInput): Promise<ChatContextResult> {
  const resp = await fetch('/api/chat/context', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': getOrCreateUserId(),
    },
    body: JSON.stringify(input),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(
      `Context update failed: ${resp.status}${detail ? ` — ${detail}` : ''}`,
    );
  }
  return (await resp.json().catch(() => ({}))) as ChatContextResult;
}

export interface StreamMessageOptions {
  /**
   * Abort the turn when no stream events arrive for this long (ms); 0
   * disables the watchdog. Without it a backend that stalls mid-stream
   * (e.g. upstream quota exhaustion) leaves the busy spinner on forever.
   */
  stallTimeoutMs?: number;
  /** Aborts the fetch when the caller tears the turn down (e.g. a backend switch resets the chat). */
  signal?: AbortSignal;
}

/** Read one chunk from the stream, failing when nothing arrives in time. */
async function readWithStallTimeout(
  reader: ReadableStreamDefaultReader<string>,
  stallTimeoutMs: number,
): Promise<ReadableStreamReadResult<string>> {
  if (stallTimeoutMs <= 0) return reader.read();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                `chat stream stalled: no response from the advisor for ${Math.round(stallTimeoutMs / 1000)}s`,
              ),
            ),
          stallTimeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function* streamMessage(
  req: ChatRequest,
  opts: StreamMessageOptions = {},
): AsyncGenerator<ChatEvent> {
  const stallTimeoutMs = opts.stallTimeoutMs ?? 0;
  const controller = new AbortController();
  // Forward the caller's teardown to the internal controller the stall
  // watchdog and error paths already use.
  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  const resp = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': getOrCreateUserId() },
    body: JSON.stringify(req),
    signal: controller.signal,
  });
  if (!resp.ok || !resp.body) {
    let detail = '';
    if (typeof resp.text === 'function') {
      detail = await resp.text().catch(() => '');
    }
    controller.abort();
    throw new Error(`Chat failed: ${resp.status}${detail ? ` — ${detail.slice(0, 300)}` : ''}`);
  }

  const reader = resp.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await readWithStallTimeout(reader, stallTimeoutMs);
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
        const event = parsed as ChatEvent;
        yield event;
        // done/error are terminal — don't keep waiting for the connection to
        // close: flaky proxies can leave it open long after the last event,
        // which used to keep the busy spinner on even though the turn ended.
        if (event.type === 'done' || event.type === 'error') return;
      }
    }
  } catch (err) {
    // Tear the fetch down so a hung backend does not hold the connection.
    controller.abort();
    throw err;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* the abort may already have released the reader */
    }
  }
}

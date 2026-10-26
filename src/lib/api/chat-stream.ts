import type { ChatEvent, ChatRequest } from '@/types';
import type { AgentEvent } from './adk/events';
import { streamAgentQuery } from './vertex/stream';
import { streamAdkQuery } from './adk/stream';
import { getAgentBackendUrl, getChatBackend, isAgentBackend } from './backend';

const encoder = new TextEncoder();

function enqueue(controller: ReadableStreamDefaultController<Uint8Array>, event: ChatEvent): void {
  controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
}

/** Re-frame backend agent events as NDJSON for the browser. */
function streamEvents(source: AsyncGenerator<AgentEvent>): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const ev of source) {
          switch (ev.type) {
            case 'text':
              enqueue(controller, { type: 'text', delta: ev.delta });
              break;
            case 'citations':
              enqueue(controller, { type: 'citations', citations: ev.citations });
              break;
            case 'session':
              enqueue(controller, { type: 'session', sessionId: ev.sessionId });
              break;
            case 'context_options':
              enqueue(controller, { type: 'context_options', options: ev.options });
              break;
            case 'context_state':
              enqueue(controller, { type: 'context_state', state: ev.state });
              break;
            case 'error':
              enqueue(controller, { type: 'error', message: ev.message });
              controller.close();
              return;
            case 'done':
              enqueue(controller, { type: 'done' });
              controller.close();
              return;
          }
        }
        enqueue(controller, { type: 'done' });
        controller.close();
      } catch (err) {
        enqueue(controller, { type: 'error', message: (err as Error).message });
        controller.close();
      }
    },
  });
}

export function streamChat(req: ChatRequest, userId: string): ReadableStream<Uint8Array> {
  // An explicit UI backend selection wins: both 'adk' and 'python' speak the
  // ADK wire contract, so they share the stream client at different URLs.
  if (isAgentBackend(req.backend)) {
    return streamEvents(
      streamAdkQuery(
        { userId, message: req.message, sessionId: req.sessionId },
        { baseUrl: getAgentBackendUrl(req.backend) },
      ),
    );
  }
  return streamEvents(
    getChatBackend() === 'local'
      ? streamAdkQuery({ userId, message: req.message, sessionId: req.sessionId })
      : streamAgentQuery({ userId, message: req.message, sessionId: req.sessionId }),
  );
}

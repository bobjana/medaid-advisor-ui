import type { ChatEvent, ChatRequest } from '@/types';
import { streamAgentQuery } from './vertex/stream';

const encoder = new TextEncoder();

function enqueue(controller: ReadableStreamDefaultController<Uint8Array>, event: ChatEvent): void {
  controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
}

export function streamChat(req: ChatRequest, userId: string): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const ev of streamAgentQuery({
          userId,
          message: req.message,
          sessionId: req.sessionId,
        })) {
          if (ev.type === 'text') {
            enqueue(controller, { type: 'text', delta: ev.delta });
          } else if (ev.type === 'citations') {
            enqueue(controller, { type: 'citations', citations: ev.citations });
          } else if (ev.type === 'session') {
            enqueue(controller, { type: 'session', sessionId: ev.sessionId });
          } else if (ev.type === 'error') {
            enqueue(controller, { type: 'error', message: ev.message });
            controller.close();
            return;
          } else if (ev.type === 'done') {
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

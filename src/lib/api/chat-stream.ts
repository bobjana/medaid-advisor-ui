import type { ChatRequest } from '@/types';
import { streamAgentQuery } from './vertex/stream';

const encoder = new TextEncoder();

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
            controller.enqueue(encoder.encode(ev.delta));
          } else if (ev.type === 'error') {
            controller.enqueue(encoder.encode(`\n[error] ${ev.message}`));
            controller.close();
            return;
          } else if (ev.type === 'done') {
            controller.close();
            return;
          }
          // 'session' currently unused by the page — pass through for future use
        }
        controller.close();
      } catch (err) {
        controller.enqueue(encoder.encode(`\n[error] ${(err as Error).message}`));
        controller.close();
      }
    },
  });
}

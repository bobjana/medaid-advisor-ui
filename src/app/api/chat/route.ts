import { NextResponse, type NextRequest } from 'next/server';
import type { ChatRequest } from '@/types';
import { streamChat } from '@/lib/api/chat-stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body?.message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const userId = req.headers.get('x-user-id') ?? 'anonymous';

  const stream = streamChat({ message: body.message, sessionId: body.sessionId }, userId);
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

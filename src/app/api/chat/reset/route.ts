import { NextResponse, type NextRequest } from 'next/server';
import { getAgentBackendUrl, getChatBackend, isAgentBackend } from '@/lib/api/backend';
import { resetSessionContext } from '@/lib/api/adk/client';
import { clearSessionContext } from '@/lib/api/vertex/sessions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: { sessionId?: string; backend?: unknown };
  try {
    body = (await req.json()) as { sessionId?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body?.sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const userId = req.headers.get('x-user-id') ?? 'anonymous';
  const agentBackend = isAgentBackend(body.backend) ? body.backend : undefined;
  const baseUrl = agentBackend ? getAgentBackendUrl(agentBackend) : undefined;

  try {
    if (agentBackend !== undefined || getChatBackend() === 'local') {
      await resetSessionContext(userId, body.sessionId, { baseUrl });
    } else {
      await clearSessionContext(body.sessionId);
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

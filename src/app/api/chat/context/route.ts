import { NextResponse, type NextRequest } from 'next/server';
import { getChatBackend } from '@/lib/api/backend';
import {
  createLocalSession,
  setSessionContext as setLocalSessionContext,
} from '@/lib/api/adk/client';
import {
  createSession,
  setSessionContext as setVertexSessionContext,
} from '@/lib/api/vertex/sessions';
import { randomUUID } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ContextBody {
  sessionId?: string;
  scheme?: string | null;
  plan?: string | null;
}

type ContextValue = { ok: true; value: string | null } | { ok: false };

function parseContextValue(value: unknown): ContextValue {
  if (value === null || value === undefined) return { ok: true, value: null };
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > 64) return { ok: false };
    return { ok: true, value: trimmed };
  }
  return { ok: false };
}

/**
 * Set (or clear) the agent-side scheme/plan context for a session without
 * adding a chat turn — used by the composer context picker.
 *
 * Body: `{ sessionId?, scheme: string|null, plan: string|null }`
 *   - `scheme` is a scheme slug (e.g. `bonitas`); `null` means "all schemes".
 *   - `plan` is a plan id (e.g. `boncomplete`); `null` means scheme-wide.
 *
 * When no `sessionId` is supplied one is created (so a context chosen before
 * the first question sticks) and returned to the client.
 */
export async function POST(req: NextRequest) {
  let body: ContextBody;
  try {
    body = (await req.json()) as ContextBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const hasScheme = Object.prototype.hasOwnProperty.call(body, 'scheme');
  const hasPlan = Object.prototype.hasOwnProperty.call(body, 'plan');
  if (!hasScheme && !hasPlan) {
    return NextResponse.json({ error: 'scheme or plan is required' }, { status: 400 });
  }

  const scheme = parseContextValue(body.scheme);
  const plan = parseContextValue(body.plan);
  if (!scheme.ok || !plan.ok) {
    return NextResponse.json({ error: 'Invalid scheme or plan' }, { status: 400 });
  }
  if (plan.value && !scheme.value) {
    return NextResponse.json({ error: 'plan requires a scheme' }, { status: 400 });
  }

  const context = {
    scheme: scheme.value,
    plan: scheme.value ? plan.value : null,
  };
  const userId = req.headers.get('x-user-id') ?? 'anonymous';
  const backend = getChatBackend();

  try {
    let sessionId = body.sessionId;
    if (!sessionId) {
      if (backend === 'local') {
        sessionId = `s-${randomUUID()}`;
        await createLocalSession(userId, sessionId);
      } else {
        sessionId = await createSession(userId);
      }
    }

    if (backend === 'local') {
      await setLocalSessionContext(userId, sessionId, context);
    } else {
      await setVertexSessionContext(sessionId, context);
    }

    return NextResponse.json({ ok: true, sessionId });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}

import { getVertexConfig } from './env';
import { getAuthToken } from './auth';
import { randomUUID } from '@/lib/utils';

const SESSION_ID_RE = /^[a-z][a-z0-9-]*[a-z0-9]$/;

function generateSessionId(): string {
  return 's-' + randomUUID();
}

function isValidSessionId(id: string): boolean {
  return id.length <= 63 && SESSION_ID_RE.test(id);
}

function getSessionsUrl(): string {
  const { project, region, agentEngineId } = getVertexConfig();
  return `https://${region}-aiplatform.googleapis.com/v1/projects/${project}/locations/${region}/reasoningEngines/${agentEngineId}/sessions`;
}

export async function createSession(userId: string): Promise<string> {
  const token = await getAuthToken();
  const session_id = generateSessionId();

  const url = new URL(getSessionsUrl());
  url.searchParams.set('sessionId', session_id);

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: userId }),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(
      `CreateSession failed: ${resp.status} ${resp.statusText}${detail ? ` — ${detail}` : ''}`,
    );
  }

  const data = await resp.json();
  const sessionName: string | undefined = data.response?.name ?? data.name;
  if (typeof sessionName === 'string' && sessionName.includes('/sessions/')) {
    const id = sessionName.split('/').pop();
    if (id) return id;
  }
  return session_id;
}

export async function ensureSessionId(userId: string, existing?: string): Promise<string> {
  if (existing && isValidSessionId(existing)) {
    return existing;
  }
  return createSession(userId);
}

export interface SessionContext {
  /** Scheme slug (e.g. `bonitas`), or `null` for "all schemes". */
  scheme: string | null;
  /** Plan id (e.g. `boncomplete`), or `null` for scheme-wide. */
  plan: string | null;
}

/**
 * Agent Engine sessions cannot be patched directly ("you can only update it
 * by appending an event"), so context changes append an event whose state
 * delta sets (or nulls) the scheme/plan keys. A missing session (404) is
 * treated as a no-op.
 */
async function appendStateDelta(
  sessionId: string,
  stateDelta: Record<string, string | null>,
  opts: { label: string; invocationPrefix: string },
): Promise<void> {
  if (!isValidSessionId(sessionId)) {
    throw new Error(`Invalid session id: ${sessionId}`);
  }
  const token = await getAuthToken();

  const url = `${getSessionsUrl()}/${encodeURIComponent(sessionId)}:appendEvent`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      author: 'user',
      invocationId: `${opts.invocationPrefix}-${randomUUID()}`,
      timestamp: new Date().toISOString(),
      actions: {
        stateDelta,
      },
    }),
  });

  if (resp.ok || resp.status === 404) return;
  const detail = await resp.text().catch(() => '');
  throw new Error(
    `${opts.label} failed: ${resp.status} ${resp.statusText}${detail ? ` — ${detail}` : ''}`,
  );
}

/** Scope the session to a scheme and/or plan. */
export async function setSessionContext(
  sessionId: string,
  context: SessionContext,
): Promise<void> {
  await appendStateDelta(
    sessionId,
    { selected_scheme: context.scheme, selected_plan: context.plan },
    { label: 'SetSessionContext', invocationPrefix: 'set-context' },
  );
}

/**
 * Clear the agent's selected scheme/plan context for a session.
 *
 * The agent's context guard treats null as "unset" and re-prompts for a scheme
 * on the next turn.
 */
export async function clearSessionContext(sessionId: string): Promise<void> {
  await appendStateDelta(
    sessionId,
    { selected_scheme: null, selected_plan: null },
    { label: 'ClearSessionContext', invocationPrefix: 'clear-context' },
  );
}

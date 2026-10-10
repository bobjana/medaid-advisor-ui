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

/**
 * Clear the agent's selected scheme/plan context for a session.
 *
 * Agent Engine sessions cannot be patched directly ("you can only update it
 * by appending an event"), so this appends a marker event whose state delta
 * nulls the context keys. The agent's context guard treats null as "unset"
 * and re-prompts for a scheme on the next turn. A missing session (404) is
 * treated as already-clear.
 */
export async function clearSessionContext(sessionId: string): Promise<void> {
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
      invocationId: `clear-context-${randomUUID()}`,
      timestamp: new Date().toISOString(),
      actions: {
        stateDelta: {
          selected_scheme: null,
          selected_plan: null,
        },
      },
    }),
  });

  if (resp.ok || resp.status === 404) return;
  const detail = await resp.text().catch(() => '');
  throw new Error(
    `ClearSessionContext failed: ${resp.status} ${resp.statusText}${detail ? ` — ${detail}` : ''}`,
  );
}

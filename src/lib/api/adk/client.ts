import { getLocalBackendUrl } from '../backend';

const DEFAULT_APP_NAME = 'medaid_advisor_agent';

export function getAdkAppName(): string {
  return process.env.ADK_APP_NAME ?? DEFAULT_APP_NAME;
}

function getSessionsUrl(userId: string): string {
  return `${getLocalBackendUrl()}/apps/${getAdkAppName()}/users/${encodeURIComponent(userId)}/sessions`;
}

export async function createLocalSession(userId: string, sessionId: string): Promise<void> {
  const resp = await fetch(getSessionsUrl(userId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  if (resp.ok || resp.status === 409) return;
  const detail = await resp.text().catch(() => '');
  throw new Error(
    `ADK CreateSession failed: ${resp.status} ${resp.statusText}${detail ? ` — ${detail}` : ''}`,
  );
}

export interface LocalSessionContext {
  /** Scheme slug (e.g. `bonitas`), or `null` for "all schemes". */
  scheme: string | null;
  /** Plan id (e.g. `boncomplete`), or `null` for scheme-wide. */
  plan: string | null;
}

/**
 * Scope the session to a scheme and/or plan. The ADK dev server stores state
 * directly, so we PATCH a `state_delta` (a null value clears the key).
 */
export async function setSessionContext(
  userId: string,
  sessionId: string,
  context: LocalSessionContext,
): Promise<void> {
  const url = `${getLocalBackendUrl()}/apps/${getAdkAppName()}/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(sessionId)}`;
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      state_delta: {
        selected_scheme: context.scheme,
        selected_plan: context.plan,
      },
    }),
  });
  if (resp.ok || resp.status === 404) return;
  const detail = await resp.text().catch(() => '');
  throw new Error(
    `ADK setSessionContext failed: ${resp.status} ${resp.statusText}${detail ? ` — ${detail}` : ''}`,
  );
}

export async function resetSessionContext(userId: string, sessionId: string): Promise<void> {
  const url = `${getLocalBackendUrl()}/apps/${getAdkAppName()}/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(sessionId)}`;
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      state_delta: { selected_scheme: null, selected_plan: null },
    }),
  });
  if (resp.ok || resp.status === 404) return;
  const detail = await resp.text().catch(() => '');
  throw new Error(
    `ADK resetSessionContext failed: ${resp.status} ${resp.statusText}${detail ? ` — ${detail}` : ''}`,
  );
}

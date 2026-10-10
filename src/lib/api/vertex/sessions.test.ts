import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { clearSessionContext } from './sessions';
import { setAuthProvider } from './auth';

const SESSIONS_URL =
  'https://us-central1-aiplatform.googleapis.com/v1/projects/test-project/' +
  'locations/us-central1/reasoningEngines/test-engine/sessions';

beforeAll(() => {
  process.env.VERTEX_PROJECT = 'test-project';
  process.env.VERTEX_REGION = 'us-central1';
  process.env.AGENT_ENGINE_ID = 'test-engine';
  setAuthProvider({ getToken: async () => 'test-token' });
});

afterAll(() => {
  delete process.env.VERTEX_PROJECT;
  delete process.env.VERTEX_REGION;
  delete process.env.AGENT_ENGINE_ID;
});

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('clearSessionContext', () => {
  it('appends an event that nulls the scheme/plan state keys', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK' });
    globalThis.fetch = fetchMock;

    await clearSessionContext('s-session-123');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${SESSIONS_URL}/s-session-123:appendEvent`);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer test-token');

    const body = JSON.parse(init.body);
    expect(body.author).toBe('user');
    expect(body.invocationId).toMatch(/^clear-context-/);
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
    expect(body.actions.stateDelta).toEqual({
      selected_scheme: null,
      selected_plan: null,
    });
  });

  it('treats a missing session (404) as already cleared', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(clearSessionContext('s-session-123')).resolves.toBeUndefined();
  });

  it('throws with status detail on other non-OK responses', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: () => Promise.resolve('permission denied'),
    });

    await expect(clearSessionContext('s-session-123')).rejects.toThrow(
      /ClearSessionContext failed: 403 Forbidden — permission denied/,
    );
  });

  it('rejects invalid session ids before calling the API', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    await expect(clearSessionContext('bad id!')).rejects.toThrow(/Invalid session id/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

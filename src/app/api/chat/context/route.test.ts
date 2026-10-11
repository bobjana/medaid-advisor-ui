import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST } from './route';
import { getChatBackend } from '@/lib/api/backend';
import { createLocalSession, setSessionContext as setLocalSessionContext } from '@/lib/api/adk/client';
import { createSession, setSessionContext as setVertexSessionContext } from '@/lib/api/vertex/sessions';

vi.mock('@/lib/api/backend', () => ({ getChatBackend: vi.fn() }));
vi.mock('@/lib/api/adk/client', () => ({
  createLocalSession: vi.fn(),
  setSessionContext: vi.fn(),
}));
vi.mock('@/lib/api/vertex/sessions', () => ({
  createSession: vi.fn(),
  setSessionContext: vi.fn(),
}));

const mockedGetChatBackend = vi.mocked(getChatBackend);
const mockedCreateLocalSession = vi.mocked(createLocalSession);
const mockedSetLocalSessionContext = vi.mocked(setLocalSessionContext);
const mockedCreateSession = vi.mocked(createSession);
const mockedSetVertexSessionContext = vi.mocked(setVertexSessionContext);

function request(body: unknown, userId = 'user-1'): NextRequest {
  return new Request('http://localhost/api/chat/context', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe('POST /api/chat/context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateLocalSession.mockResolvedValue(undefined);
    mockedSetLocalSessionContext.mockResolvedValue(undefined);
    mockedCreateSession.mockResolvedValue('s-created');
    mockedSetVertexSessionContext.mockResolvedValue(undefined);
  });

  it('sets the scheme/plan on the GCP session', async () => {
    mockedGetChatBackend.mockReturnValue('gcp');

    const res = await POST(request({ sessionId: 's-abc', scheme: 'bonitas', plan: 'boncomplete' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, sessionId: 's-abc' });
    expect(mockedSetVertexSessionContext).toHaveBeenCalledWith('s-abc', {
      scheme: 'bonitas',
      plan: 'boncomplete',
    });
    expect(mockedCreateSession).not.toHaveBeenCalled();
  });

  it('treats a scheme-only selection as scheme-wide (plan null)', async () => {
    mockedGetChatBackend.mockReturnValue('gcp');

    const res = await POST(request({ sessionId: 's-abc', scheme: 'discovery' }));

    expect(res.status).toBe(200);
    expect(mockedSetVertexSessionContext).toHaveBeenCalledWith('s-abc', {
      scheme: 'discovery',
      plan: null,
    });
  });

  it('clears the context when scheme and plan are null', async () => {
    mockedGetChatBackend.mockReturnValue('gcp');

    const res = await POST(request({ sessionId: 's-abc', scheme: null, plan: null }));

    expect(res.status).toBe(200);
    expect(mockedSetVertexSessionContext).toHaveBeenCalledWith('s-abc', {
      scheme: null,
      plan: null,
    });
  });

  it('creates a session when none is supplied (context chosen before the first question)', async () => {
    mockedGetChatBackend.mockReturnValue('gcp');

    const res = await POST(request({ scheme: 'bonitas' }));

    expect(res.status).toBe(200);
    expect(mockedCreateSession).toHaveBeenCalledWith('user-1');
    expect(await res.json()).toEqual({ ok: true, sessionId: 's-created' });
    expect(mockedSetVertexSessionContext).toHaveBeenCalledWith('s-created', {
      scheme: 'bonitas',
      plan: null,
    });
  });

  it('patches state_delta on the local backend and creates a session if needed', async () => {
    mockedGetChatBackend.mockReturnValue('local');

    const res = await POST(request({ scheme: 'bonitas', plan: 'boncap' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(typeof body.sessionId).toBe('string');
    expect(mockedCreateLocalSession).toHaveBeenCalledWith('user-1', body.sessionId);
    expect(mockedSetLocalSessionContext).toHaveBeenCalledWith('user-1', body.sessionId, {
      scheme: 'bonitas',
      plan: 'boncap',
    });
    expect(mockedSetVertexSessionContext).not.toHaveBeenCalled();
  });

  it('rejects a plan without a scheme', async () => {
    mockedGetChatBackend.mockReturnValue('gcp');

    const res = await POST(request({ sessionId: 's-abc', plan: 'executive' }));

    expect(res.status).toBe(400);
    expect(mockedSetVertexSessionContext).not.toHaveBeenCalled();
  });

  it('rejects an empty body', async () => {
    mockedGetChatBackend.mockReturnValue('gcp');

    const res = await POST(request({ sessionId: 's-abc' }));

    expect(res.status).toBe(400);
    expect(mockedSetVertexSessionContext).not.toHaveBeenCalled();
  });

  it('rejects invalid types', async () => {
    mockedGetChatBackend.mockReturnValue('gcp');

    const res = await POST(request({ scheme: 123 }));

    expect(res.status).toBe(400);
  });

  it('maps failures to 502 with the underlying message', async () => {
    mockedGetChatBackend.mockReturnValue('gcp');
    mockedSetVertexSessionContext.mockRejectedValue(
      new Error('SetSessionContext failed: 403 Forbidden — denied'),
    );

    const res = await POST(request({ sessionId: 's-abc', scheme: 'bonitas' }));

    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain('403 Forbidden');
  });
});

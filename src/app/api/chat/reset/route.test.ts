import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST } from './route';
import { getChatBackend } from '@/lib/api/backend';
import { resetSessionContext } from '@/lib/api/adk/client';
import { clearSessionContext } from '@/lib/api/vertex/sessions';

vi.mock('@/lib/api/backend', () => ({ getChatBackend: vi.fn() }));
vi.mock('@/lib/api/adk/client', () => ({ resetSessionContext: vi.fn() }));
vi.mock('@/lib/api/vertex/sessions', () => ({ clearSessionContext: vi.fn() }));

const mockedGetChatBackend = vi.mocked(getChatBackend);
const mockedResetSessionContext = vi.mocked(resetSessionContext);
const mockedClearSessionContext = vi.mocked(clearSessionContext);

function request(body: unknown, userId = 'user-1'): NextRequest {
  return new Request('http://localhost/api/chat/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe('POST /api/chat/reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResetSessionContext.mockResolvedValue(undefined);
    mockedClearSessionContext.mockResolvedValue(undefined);
  });

  it('patches session state on the local backend', async () => {
    mockedGetChatBackend.mockReturnValue('local');

    const res = await POST(request({ sessionId: 's-abc' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockedResetSessionContext).toHaveBeenCalledWith('user-1', 's-abc');
    expect(mockedClearSessionContext).not.toHaveBeenCalled();
  });

  it('appends a clear-context event on the GCP backend', async () => {
    mockedGetChatBackend.mockReturnValue('gcp');

    const res = await POST(request({ sessionId: 's-abc' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockedClearSessionContext).toHaveBeenCalledWith('s-abc');
    expect(mockedResetSessionContext).not.toHaveBeenCalled();
  });

  it('returns 400 when sessionId is missing', async () => {
    mockedGetChatBackend.mockReturnValue('gcp');

    const res = await POST(request({}));

    expect(res.status).toBe(400);
    expect(mockedClearSessionContext).not.toHaveBeenCalled();
  });

  it('maps clear failures to 502 with the underlying message', async () => {
    mockedGetChatBackend.mockReturnValue('gcp');
    mockedClearSessionContext.mockRejectedValue(
      new Error('ClearSessionContext failed: 403 Forbidden — denied'),
    );

    const res = await POST(request({ sessionId: 's-abc' }));

    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain('403 Forbidden');
  });
});

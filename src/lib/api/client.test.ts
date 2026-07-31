import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiClient, ApiError } from './client';

describe('apiClient', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends a request with JSON Content-Type by default and returns the parsed body', async () => {
    const mockResponse = { hello: 'world' };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });
    globalThis.fetch = fetchMock;

    const result = await apiClient<typeof mockResponse>('/test');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8080/test');
    expect(init.method).toBeUndefined();
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(result).toEqual(mockResponse);
  });

  it('prepends a slash to endpoints that do not start with one', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    globalThis.fetch = fetchMock;

    await apiClient('no-leading-slash');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8080/no-leading-slash');
  });

  it('merges caller-provided headers without dropping the JSON Content-Type', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    globalThis.fetch = fetchMock;

    await apiClient('/test', {
      headers: { 'X-Trace-Id': 'abc-123' },
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers['X-Trace-Id']).toBe('abc-123');
  });

  it('propagates body and method from caller options', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
    globalThis.fetch = fetchMock;

    await apiClient('/test', {
      method: 'PUT',
      body: JSON.stringify({ a: 1 }),
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('PUT');
    expect(init.body).toBe('{"a":1}');
  });

  it('throws ApiError with status and statusText on non-OK responses', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
    });

    await expect(apiClient('/test')).rejects.toBeInstanceOf(ApiError);

    try {
      await apiClient('/test');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(422);
      expect(apiErr.statusText).toBe('Unprocessable Entity');
      expect(apiErr.message).toContain('Unprocessable Entity');
    }
  });
});

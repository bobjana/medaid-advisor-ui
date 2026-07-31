import { describe, it, expect, vi, afterEach } from 'vitest';
import { getRecommendations } from './recommend';
import { initialData } from '@/types';

afterEach(() => {
  vi.restoreAllMocks();
});

const sampleClientData = {
  ...initialData,
  hasStarted: true,
  personalDetails: {
    fullName: 'Test User',
    idNumber: '9001010001088',
    dateOfBirth: '1990-01-01',
    gender: 'male' as const,
    email: 'test@example.com',
    phone: '+27123456789',
    address: '1 Test Street',
  },
  budgetRange: '2000_4000' as const,
};

describe('getRecommendations', () => {
  it('POSTs the clientData to /recommend and returns the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          recommendations: [],
          reasoning: [],
          alternatives: [],
        }),
    });
    globalThis.fetch = fetchMock;

    const result = await getRecommendations({ clientData: sampleClientData });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8080/recommend');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ clientData: sampleClientData });
    expect(result).toEqual({ recommendations: [], reasoning: [], alternatives: [] });
  });

  it('propagates ApiError on non-OK responses', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(
      getRecommendations({ clientData: sampleClientData }),
    ).rejects.toMatchObject({
      status: 500,
      statusText: 'Internal Server Error',
    });
  });
});

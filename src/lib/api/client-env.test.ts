import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

describe('API_BASE module evaluation', () => {
  const originalValue = process.env.NEXT_PUBLIC_API_BASE_URL;

  afterAll(() => {
    if (originalValue === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalValue;
    }
  });

  describe('when env var is unset', () => {
    beforeAll(async () => {
      vi.resetModules();
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    });

    it('falls back to http://localhost:8080', async () => {
      const mod = await import('./client');
      expect(mod.API_BASE).toBe('http://localhost:8080');
    });
  });

  describe('when env var is set', () => {
    beforeAll(async () => {
      vi.resetModules();
      process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com';
    });

    it('uses the env var value', async () => {
      const mod = await import('./client');
      expect(mod.API_BASE).toBe('https://api.example.com');
    });
  });
});

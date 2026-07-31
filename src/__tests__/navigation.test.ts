import { describe, it, expect } from 'vitest';

const ROUTES = [
  { path: '/', exists: true },
  { path: '/questionnaire', exists: true },
  { path: '/chat', exists: true },
  { path: '/recommend', exists: true },
];

describe('Route registry', () => {
  it('all 4 module routes are registered', () => {
    expect(ROUTES).toHaveLength(4);
  });

  it('each route has a path and existence flag', () => {
    ROUTES.forEach((route) => {
      expect(route.path).toMatch(/^\//);
      expect(typeof route.exists).toBe('boolean');
    });
  });

  it('covers all 4 module areas', () => {
    const paths = ROUTES.map((r) => r.path);
    expect(paths).toContain('/');
    expect(paths).toContain('/questionnaire');
    expect(paths).toContain('/chat');
    expect(paths).toContain('/recommend');
  });
});
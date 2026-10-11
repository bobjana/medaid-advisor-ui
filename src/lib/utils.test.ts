import { describe, it, expect } from 'vitest';
import { cn, nowMs, randomUUID } from './utils';

describe('cn', () => {
  it('returns a single class unchanged', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('joins multiple classes with a space', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('drops falsy values', () => {
    expect(cn('foo', false, null, undefined, 0, '', 'bar')).toBe('foo bar');
  });

  it('flattens nested arrays', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });

  it('supports conditional object syntax', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });

  it('resolves Tailwind conflicts by keeping the later class', () => {
    // tailwind-merge: when both px-2 and px-4 apply, the later wins
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('resolves Tailwind conflicts across cn invocations', () => {
    const base = cn('text-sm text-red-500');
    const overridden = cn(base, 'text-blue-500');
    expect(overridden).toContain('text-blue-500');
    expect(overridden).not.toContain('text-red-500');
  });

  it('returns empty string when given no inputs', () => {
    expect(cn()).toBe('');
  });
});

describe('nowMs', () => {
  it('returns the current wall-clock time', () => {
    const before = Date.now();
    const value = nowMs();
    const after = Date.now();
    expect(value).toBeGreaterThanOrEqual(before);
    expect(value).toBeLessThanOrEqual(after);
  });
});

describe('randomUUID', () => {
  it('returns a v4-shaped identifier', () => {
    expect(randomUUID()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial value', () => {
    it('returns the provided initialValue when the key is not set', () => {
      const { result } = renderHook(() => useLocalStorage('missing', 'fallback'));
      expect(result.current[0]).toBe('fallback');
    });

    it('reads and parses an existing value', () => {
      window.localStorage.setItem('present', JSON.stringify({ count: 5 }));
      const { result } = renderHook(() =>
        useLocalStorage<{ count: number }>('present', { count: 0 }),
      );
      expect(result.current[0]).toEqual({ count: 5 });
    });

    it('falls back to initialValue and logs when stored JSON is malformed', () => {
      window.localStorage.setItem('broken', '{not json');
      const { result } = renderHook(() => useLocalStorage('broken', 'default'));
      expect(result.current[0]).toBe('default');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('setValue', () => {
    it('writes a JSON-encoded value to localStorage and updates state', () => {
      const { result } = renderHook(() => useLocalStorage('counter', 0));

      act(() => {
        result.current[1](42);
      });

      expect(result.current[0]).toBe(42);
      expect(window.localStorage.getItem('counter')).toBe('42');
    });

    it('accepts an updater function', () => {
      const { result } = renderHook(() => useLocalStorage('counter', 10));

      act(() => {
        result.current[1]((prev) => prev + 5);
      });

      expect(result.current[0]).toBe(15);
      expect(window.localStorage.getItem('counter')).toBe('15');
    });

    it('logs and does not throw when localStorage.setItem fails', () => {
      const setItemSpy = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new Error('QuotaExceededError');
        });

      const { result } = renderHook(() => useLocalStorage('k', 'v'));

      act(() => {
        result.current[1]('new');
      });

      expect(console.error).toHaveBeenCalled();
      // State still updates because setStoredValue runs before the throwing setItem
      expect(result.current[0]).toBe('new');

      setItemSpy.mockRestore();
    });
  });

  describe('removeValue', () => {
    it('removes the key from localStorage and resets to initialValue', () => {
      window.localStorage.setItem('temp', JSON.stringify('hello'));
      const { result } = renderHook(() => useLocalStorage('temp', 'reset'));

      act(() => {
        result.current[2]();
      });

      expect(window.localStorage.getItem('temp')).toBeNull();
      expect(result.current[0]).toBe('reset');
    });
  });

  describe('cross-instance sync via the storage event', () => {
    it('updates state when another tab/window writes the same key', () => {
      const { result } = renderHook(() => useLocalStorage('shared', 'a'));

      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'shared',
            newValue: JSON.stringify('b'),
          }),
        );
      });

      expect(result.current[0]).toBe('b');
    });

    it('ignores storage events for different keys', () => {
      const { result } = renderHook(() => useLocalStorage('mine', 'a'));

      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'other',
            newValue: JSON.stringify('b'),
          }),
        );
      });

      expect(result.current[0]).toBe('a');
    });

    it('ignores storage events with malformed JSON', () => {
      const { result } = renderHook(() => useLocalStorage('shared', 'a'));

      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'shared',
            newValue: 'not-json',
          }),
        );
      });

      expect(result.current[0]).toBe('a');
    });
  });
});

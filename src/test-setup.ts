import '@testing-library/jest-dom/vitest';

/*
 * Node 25+ exposes a `localStorage` accessor on the global object that returns
 * `undefined` unless the process was started with `--localstorage-file`. In the
 * vitest jsdom environment that accessor shadows jsdom's own implementation, so
 * `window.localStorage` is undefined and anything touching it fails.
 *
 * Install a spec-compatible in-memory Storage instead. Methods live on
 * `Storage.prototype` (rather than on the instance) so tests can keep using
 * `vi.spyOn(Storage.prototype, 'setItem')`.
 */
if (typeof window !== 'undefined' && !window.localStorage) {
  const stores = new WeakMap<object, Map<string, string>>();

  function storeFor(self: object): Map<string, string> {
    let store = stores.get(self);
    if (!store) {
      store = new Map();
      stores.set(self, store);
    }
    return store;
  }

  Object.defineProperties(Storage.prototype, {
    getItem: {
      configurable: true,
      writable: true,
      value(this: object, key: string): string | null {
        const store = storeFor(this);
        const k = String(key);
        return store.has(k) ? (store.get(k) as string) : null;
      },
    },
    setItem: {
      configurable: true,
      writable: true,
      value(this: object, key: string, value: string): void {
        storeFor(this).set(String(key), String(value));
      },
    },
    removeItem: {
      configurable: true,
      writable: true,
      value(this: object, key: string): void {
        storeFor(this).delete(String(key));
      },
    },
    clear: {
      configurable: true,
      writable: true,
      value(this: object): void {
        storeFor(this).clear();
      },
    },
    key: {
      configurable: true,
      writable: true,
      value(this: object, index: number): string | null {
        return [...storeFor(this).keys()][index] ?? null;
      },
    },
    length: {
      configurable: true,
      get(this: object): number {
        return storeFor(this).size;
      },
    },
  });

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: Object.create(Storage.prototype) as Storage,
  });
}

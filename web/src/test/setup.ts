import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

const values = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, String(value)),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  },
});
Object.defineProperty(globalThis, 'matchMedia', {
  configurable: true,
  value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
});
Object.defineProperty(navigator, 'clipboard', {
  configurable: true,
  value: { writeText: async () => undefined },
});
Object.defineProperty(globalThis, 'scrollTo', { configurable: true, value: () => undefined });

afterEach(() => cleanup());

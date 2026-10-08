export const NETWORK_GLOBAL_NAMES = [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'importScripts',
  'Worker',
  'SharedWorker',
] as const;

const BROWSER_STATE_NAMES = [
  'navigator',
  'location',
  'caches',
  'indexedDB',
  'localStorage',
  'sessionStorage',
  'BroadcastChannel',
  'File',
  'FileReader',
] as const;

export function lockDownRuntimeGlobals(
  target: Record<string, unknown>,
  options: { lockBrowserState?: boolean; lockDynamicCode?: boolean } = {},
) {
  const names = [
    ...(options.lockDynamicCode ? ['eval', 'Function'] : []),
    ...NETWORK_GLOBAL_NAMES,
    ...(options.lockBrowserState === false ? [] : BROWSER_STATE_NAMES),
  ];
  for (const name of names) {
    try {
      Object.defineProperty(target, name, {
        configurable: false,
        value: undefined,
        writable: false,
      });
    } catch {
      // Some browser globals are non-configurable; the worker CSP is the second boundary.
    }
  }
}

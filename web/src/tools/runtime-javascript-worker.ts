import {
  RUNTIME_MAX_OUTPUT_LENGTH,
  type RuntimeRunMessage,
  type RuntimeWorkerMessage,
  validateJavaScriptSource,
} from './runtime-playground-protocol';
import { lockDownRuntimeGlobals } from './runtime-playground-capabilities';

const createFunction = Function;

function send(message: RuntimeWorkerMessage) {
  self.postMessage(message);
}

self.onmessage = (event: MessageEvent<RuntimeRunMessage>) => {
  const { code, runId } = event.data;
  const sourceError = validateJavaScriptSource(code);
  if (sourceError) {
    send({ type: 'error', runId, error: sourceError });
    return;
  }

  lockDownRuntimeGlobals(globalThis);
  let outputLength = 0;
  const write = (type: 'stdout' | 'stderr', values: unknown[]) => {
    if (outputLength >= RUNTIME_MAX_OUTPUT_LENGTH) return;
    const text = `${values.map((value) => formatValue(value)).join(' ')}\n`;
    const remaining = RUNTIME_MAX_OUTPUT_LENGTH - outputLength;
    const chunk = text.slice(0, remaining);
    outputLength += chunk.length;
    send({ type, runId, text: chunk });
  };
  const consoleProxy = {
    log: (...values: unknown[]) => write('stdout', values),
    info: (...values: unknown[]) => write('stdout', values),
    warn: (...values: unknown[]) => write('stderr', values),
    error: (...values: unknown[]) => write('stderr', values),
  };

  try {
    const execute = createFunction(
      'console',
      'fetch',
      'XMLHttpRequest',
      'WebSocket',
      'importScripts',
      'Worker',
      'SharedWorker',
      'document',
      'localStorage',
      'sessionStorage',
      'indexedDB',
      'caches',
      'location',
      'navigator',
      'self',
      'globalThis',
      `'use strict'; return (async () => {\n${code}\n})();`,
    );
    Promise.resolve(execute(consoleProxy, ...Array.from({ length: 15 }, () => undefined)))
      .then(() => send({ type: 'done', runId }))
      .catch((error: unknown) => send({ type: 'error', runId, error: formatError(error) }));
  } catch (error) {
    send({ type: 'error', runId, error: formatError(error) });
  }
};

function formatValue(value: unknown) {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.stack ?? value.message;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatError(error: unknown) {
  return error instanceof Error ? (error.stack ?? error.message) : String(error);
}

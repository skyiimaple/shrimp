export const RUNTIME_MAX_CODE_LENGTH = 50_000;
export const RUNTIME_MAX_OUTPUT_LENGTH = 20_000;
export const RUNTIME_TIMEOUT_MS = 3_000;

export type RuntimeLanguage = 'javascript' | 'python';

export type RuntimeRunMessage = {
  type: 'run';
  runId: string;
  code: string;
};

export type RuntimeWorkerMessage =
  | { type: 'status'; runId: string; status: 'initializing' | 'ready' }
  | { type: 'stdout' | 'stderr'; runId: string; text: string }
  | { type: 'done'; runId: string }
  | { type: 'error'; runId: string; error: string };

export function validateRuntimeCode(code: string) {
  if (code.length > RUNTIME_MAX_CODE_LENGTH)
    return `代码不能超过 ${RUNTIME_MAX_CODE_LENGTH.toLocaleString()} 个字符`;
  return undefined;
}

export function trimRuntimeOutput(value: string) {
  return value.length > RUNTIME_MAX_OUTPUT_LENGTH
    ? `${value.slice(0, RUNTIME_MAX_OUTPUT_LENGTH)}\n…输出已截断…`
    : value;
}

const blockedJavaScriptNames = [
  'caches',
  'constructor',
  'document',
  'eval',
  'fetch',
  'File',
  'FileReader',
  'Function',
  'globalThis',
  'importScripts',
  'indexedDB',
  'localStorage',
  'location',
  'navigator',
  'postMessage',
  'prototype',
  'self',
  'sessionStorage',
  'SharedWorker',
  'URL',
  'WebSocket',
  'Worker',
  'XMLHttpRequest',
  '__proto__',
] as const;

export function validateJavaScriptSource(code: string) {
  const blocked = blockedJavaScriptNames.find((name) => new RegExp(`\\b${name}\\b`).test(code));
  if (blocked) return `JavaScript 运行环境不允许访问 ${blocked}`;
  return /\bimport\s*\(/.test(code) ? 'JavaScript 运行环境不允许导入外部模块' : undefined;
}

export function validatePythonSource(code: string) {
  return /(?:\b(?:import\s+(?:js|pyodide|micropip|os|pathlib|socket|urllib|http|subprocess|requests|builtins|sys|ctypes|importlib)|from\s+(?:js|pyodide|os|pathlib|socket|urllib|http|subprocess|requests|builtins|sys|ctypes|importlib)|(?:open|input|eval|exec|getattr|globals|locals|vars)\s*\()|__import__|__builtins__)/.test(
    code,
  )
    ? 'Python 运行环境不允许访问网络、文件或外部模块'
    : undefined;
}

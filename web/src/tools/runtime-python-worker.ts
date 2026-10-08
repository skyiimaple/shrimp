import { loadPyodide, type PyodideInterface } from 'pyodide';
import {
  type RuntimeRunMessage,
  type RuntimeWorkerMessage,
  RUNTIME_MAX_OUTPUT_LENGTH,
  validatePythonSource,
} from './runtime-playground-protocol';
import { lockDownRuntimeGlobals } from './runtime-playground-capabilities';

let pyodide: PyodideInterface | undefined;
let loading: Promise<PyodideInterface> | undefined;

async function getPyodide(runId: string) {
  if (pyodide) return pyodide;
  if (!loading) {
    send({ type: 'status', runId, status: 'initializing' });
    const indexURL = new URL('/pyodide/', self.location.origin).href;
    loading = loadPyodide({
      indexURL,
      lockFileURL: `${indexURL}pyodide-lock.json`,
      stdout: () => undefined,
      stderr: () => undefined,
    }).then((runtime) => {
      pyodide = runtime;
      return runtime;
    });
  }
  return loading;
}

self.onmessage = async (event: MessageEvent<RuntimeRunMessage>) => {
  const { code, runId } = event.data;
  const sourceError = validatePythonSource(code);
  if (sourceError) {
    send({ type: 'error', runId, error: sourceError });
    return;
  }
  try {
    const runtime = await getPyodide(runId);
    lockDownRuntimeGlobals(globalThis, { lockDynamicCode: false });
    send({ type: 'status', runId, status: 'ready' });
    let outputLength = 0;
    const write = (type: 'stdout' | 'stderr', text: string) => {
      if (outputLength >= RUNTIME_MAX_OUTPUT_LENGTH) return;
      const remaining = RUNTIME_MAX_OUTPUT_LENGTH - outputLength;
      const chunk = text.slice(0, remaining);
      outputLength += chunk.length;
      send({ type, runId, text: chunk });
    };
    runtime.setStdout({ batched: (text) => write('stdout', `${text}\n`) });
    runtime.setStderr({ batched: (text) => write('stderr', `${text}\n`) });
    runtime.setStdin({
      stdin: () => {
        throw new Error('不支持 input()，请直接在代码中提供输入');
      },
    });
    const sandbox = runtime.toPy({ _user_code: code });
    try {
      await runtime.runPythonAsync(SANDBOX_PRELUDE, { globals: sandbox, locals: sandbox });
    } finally {
      sandbox.destroy();
    }
    send({ type: 'done', runId });
  } catch (error) {
    send({ type: 'error', runId, error: formatError(error) });
    loading = undefined;
    pyodide = undefined;
  }
};

const SANDBOX_PRELUDE = `
import builtins as _builtins
import sys as _sys
import types as _types

_sys.modules["js"] = _types.ModuleType("js")

_blocked_roots = {
    "js", "pyodide", "micropip", "os", "pathlib", "socket", "urllib",
    "http", "subprocess", "requests", "builtins", "sys", "ctypes", "importlib"
}
_original_import = _builtins.__import__

def _safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    if name.split(".", 1)[0] in _blocked_roots:
        raise ImportError("该运行环境不允许导入此模块")
    return _original_import(name, globals, locals, fromlist, level)

_safe_builtins = dict(vars(_builtins))
_safe_builtins["__import__"] = _safe_import
for _name in ("open", "input", "eval", "exec", "compile", "globals", "locals", "vars", "getattr", "setattr", "delattr", "breakpoint"):
    _safe_builtins.pop(_name, None)
_user_globals = {"__builtins__": _safe_builtins, "__name__": "__main__"}
exec(_user_code, _user_globals, _user_globals)
`;

function send(message: RuntimeWorkerMessage) {
  self.postMessage(message);
}

function formatError(error: unknown) {
  return error instanceof Error ? (error.stack ?? error.message) : String(error);
}

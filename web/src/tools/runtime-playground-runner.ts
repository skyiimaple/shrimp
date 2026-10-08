import {
  RUNTIME_TIMEOUT_MS,
  type RuntimeLanguage,
  type RuntimeWorkerMessage,
  trimRuntimeOutput,
  validateRuntimeCode,
} from './runtime-playground-protocol';

export type RuntimeRunnerEvent =
  | { type: 'status'; status: 'initializing' | 'ready' }
  | { type: 'stdout' | 'stderr'; text: string }
  | { type: 'done' }
  | { type: 'error'; error: string };

type ActiveRun = {
  language: RuntimeLanguage;
  runId: string;
  timer: ReturnType<typeof setTimeout>;
  worker: Worker;
  onEvent: (event: RuntimeRunnerEvent) => void;
};

export class RuntimeRunner {
  private active?: ActiveRun;
  private workers = new Map<RuntimeLanguage, Worker>();

  run(language: RuntimeLanguage, code: string, onEvent: (event: RuntimeRunnerEvent) => void) {
    this.stop('操作已停止');
    const validationError = validateRuntimeCode(code);
    if (validationError) {
      onEvent({ type: 'error', error: validationError });
      return;
    }
    const worker = this.getWorker(language);
    const runId = `${language}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const active: ActiveRun = {
      language,
      runId,
      timer: setTimeout(
        () => this.finish(active, { type: 'error', error: '执行超时，已终止运行' }),
        RUNTIME_TIMEOUT_MS,
      ),
      worker,
      onEvent,
    };
    this.active = active;
    worker.onmessage = (event: MessageEvent<RuntimeWorkerMessage>) => {
      const message = event.data;
      if (message.runId !== runId || this.active !== active) return;
      if (message.type === 'stdout' || message.type === 'stderr') {
        onEvent({ type: message.type, text: trimRuntimeOutput(message.text) });
      } else if (message.type === 'status') {
        onEvent({ type: 'status', status: message.status });
      } else if (message.type === 'done') {
        this.finish(active, { type: 'done' });
      } else if (message.type === 'error') {
        this.finish(active, { type: 'error', error: trimRuntimeOutput(message.error) });
      }
    };
    worker.onerror = (event) => {
      const detail = 'message' in event && typeof event.message === 'string' ? event.message : '';
      const location = 'filename' in event && event.filename ? ` (${event.filename}:${event.lineno ?? 0})` : '';
      this.finish(active, { type: 'error', error: `${detail || '运行环境发生错误，请重试'}${location}` });
    };
    worker.postMessage({ type: 'run', runId, code });
  }

  stop(error = '操作已停止') {
    if (!this.active) return;
    const active = this.active;
    this.active = undefined;
    clearTimeout(active.timer);
    active.worker.terminate();
    this.workers.delete(active.language);
    active.onEvent({ type: 'error', error });
  }

  dispose() {
    this.stop('操作已停止');
    for (const worker of this.workers.values()) worker.terminate();
    this.workers.clear();
  }

  private getWorker(language: RuntimeLanguage) {
    const current = this.workers.get(language);
    if (current) return current;
    const worker =
      language === 'javascript'
        ? new Worker(new URL('./runtime-javascript-worker.ts', import.meta.url), { type: 'module' })
        : new Worker(new URL('./runtime-python-worker.ts', import.meta.url), { type: 'module' });
    this.workers.set(language, worker);
    return worker;
  }

  private finish(
    active: ActiveRun,
    event: Extract<RuntimeRunnerEvent, { type: 'done' | 'error' }>,
  ) {
    if (this.active !== active) return;
    this.active = undefined;
    clearTimeout(active.timer);
    active.onEvent(event);
    if (event.type === 'error') {
      active.worker.terminate();
      this.workers.delete(active.language);
    }
  }
}

import type { RegexMatch } from '../../tools/lib/regex';
import type { Result } from '../../tools/lib/result';

export function runRegexInWorker(
  pattern: string,
  flags: string,
  text: string,
  signal?: AbortSignal,
): Promise<Result<RegexMatch[]>> {
  if (signal?.aborted) return Promise.resolve({ ok: false, error: '操作已取消' });
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./regex-worker.ts', import.meta.url), { type: 'module' });
    let settled = false;
    const finish = (result: Result<RegexMatch[]>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      worker.terminate();
      resolve(result);
    };
    const abort = () => finish({ ok: false, error: '操作已取消' });
    const timer = setTimeout(() => finish({ ok: false, error: '正则执行超时' }), 500);
    signal?.addEventListener('abort', abort, { once: true });
    worker.onmessage = (event: MessageEvent<Result<RegexMatch[]>>) => finish(event.data);
    worker.onerror = () => finish({ ok: false, error: '正则执行失败' });
    worker.postMessage({ pattern, flags, text });
  });
}

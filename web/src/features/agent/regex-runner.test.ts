import { afterEach, describe, expect, it, vi } from 'vitest';
import { runRegexInWorker } from './regex-runner';

class NeverReplyWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  terminated = false;
  postMessage() {}
  terminate() {
    this.terminated = true;
  }
}

describe('Agent regex isolation', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('terminates an unresponsive worker within 500 ms', async () => {
    vi.useFakeTimers();
    const worker = new NeverReplyWorker();
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          return worker;
        }
      },
    );
    let result: Awaited<ReturnType<typeof runRegexInWorker>> | undefined;
    const pending = runRegexInWorker('(a+)+$', '', 'a'.repeat(4000)).then((value) => {
      result = value;
    });
    await vi.advanceTimersByTimeAsync(500);
    expect(worker.terminated).toBe(true);
    expect(result).toEqual({ ok: false, error: '正则执行超时' });
    await pending;
  });
});

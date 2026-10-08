import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RuntimePlaygroundTool } from './runtime-playground-tool';

class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  posted: { runId: string; code: string } | undefined;
  postMessage(message: { runId: string; code: string }) {
    this.posted = message;
  }
  terminate() {}
  emit(message: unknown) {
    this.onmessage?.({ data: message } as MessageEvent);
  }
}

describe('运行环境试炼场', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('runs JavaScript and shows stdout', async () => {
    const worker = new FakeWorker();
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          return worker;
        }
      },
    );
    const user = userEvent.setup();
    render(<RuntimePlaygroundTool />);

    await user.click(screen.getByRole('button', { name: /运行/ }));
    worker.emit({ type: 'stdout', runId: worker.posted!.runId, text: '2\n' });
    worker.emit({ type: 'done', runId: worker.posted!.runId });

    expect(await screen.findByLabelText('stdout')).toHaveValue('2\n');
    expect(screen.getByRole('status')).toHaveTextContent('已完成');
  });

  it('switches language and resets to a Python example', async () => {
    const worker = new FakeWorker();
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          return worker;
        }
      },
    );
    const user = userEvent.setup();
    render(<RuntimePlaygroundTool />);

    await user.click(screen.getByRole('combobox', { name: '运行语言' }));
    await user.click(screen.getByRole('option', { name: 'Python' }));

    expect(screen.getByLabelText('代码编辑器')).toHaveValue('print(1 + 1)');
  });
});

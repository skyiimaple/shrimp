import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Base64FileTool } from './parity-file-base64-tool-panel';

describe('Base64 文件卡片', () => {
  it('选择文件后显示可复制 Data URL', async () => {
    const user = userEvent.setup();
    render(<Base64FileTool />);
    await user.upload(
      screen.getByLabelText('选择文件'),
      new File(['hello'], 'hello.txt', { type: 'text/plain' }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Data URL')).toHaveValue('data:text/plain;base64,aGVsbG8='),
    );
  });
});

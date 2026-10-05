import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { IbanTool } from './parity-iban-tool-panel';

describe('IBAN 卡片', () => {
  it('显示格式化编号和校验结果', async () => {
    const user = userEvent.setup();
    render(<IbanTool />);
    await user.type(screen.getByLabelText('IBAN'), 'DE89370400440532013000');
    await user.click(screen.getByRole('button', { name: '校验 IBAN' }));
    expect(screen.getByText('校验位有效')).toBeInTheDocument();
    expect((screen.getByLabelText('格式化 IBAN') as HTMLTextAreaElement).value).toBe(
      'DE89 3704 0044 0532 0130 00',
    );
  });
});

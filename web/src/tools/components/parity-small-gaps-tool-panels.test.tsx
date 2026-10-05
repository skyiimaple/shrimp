import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  AsciiTextTool,
  PasswordStrengthTool,
  TokenGeneratorTool,
} from './parity-small-gaps-tool-panels';

describe('small parity panels', () => {
  it('generates a token with the selected alphabet and length', async () => {
    const user = userEvent.setup();
    render(<TokenGeneratorTool />);
    fireEvent.change(screen.getByLabelText('令牌长度'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('字符集'), { target: { value: 'abc' } });
    await user.click(screen.getByRole('button', { name: '生成令牌' }));
    expect((screen.getByLabelText('令牌结果') as HTMLTextAreaElement).value).toMatch(/^[abc]{12}$/);
  });

  it('shows a heuristic password assessment', async () => {
    const user = userEvent.setup();
    render(<PasswordStrengthTool />);
    await user.type(screen.getByLabelText('待分析密码'), 'password123');
    expect(screen.getByText(/仅供参考/)).toBeInTheDocument();
    expect(screen.getByText(/弱/)).toBeInTheDocument();
  });

  it('renders ASCII and reports unsupported characters', async () => {
    const user = userEvent.setup();
    render(<AsciiTextTool />);
    fireEvent.change(screen.getByLabelText('待绘制文字'), { target: { value: 'A1' } });
    await user.click(screen.getByRole('button', { name: '绘制 ASCII' }));
    expect((screen.getByLabelText('ASCII 结果') as HTMLTextAreaElement).value).toContain('#');
    fireEvent.change(screen.getByLabelText('待绘制文字'), { target: { value: '你好' } });
    await user.click(screen.getByRole('button', { name: '绘制 ASCII' }));
    expect(screen.getByText(/不支持/)).toBeInTheDocument();
  });
});

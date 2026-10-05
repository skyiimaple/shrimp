import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  EmailNormalizerTool,
  LoremIpsumTool,
  RegexCheatsheetTool,
  TextMaskTool,
} from './parity-text-misc-tool-panels';

describe('text miscellaneous panels', () => {
  it('generates the selected number of Lorem Ipsum paragraphs', async () => {
    const user = userEvent.setup();
    render(<LoremIpsumTool />);
    fireEvent.change(screen.getByLabelText('段落数量'), { target: { value: '3' } });
    await user.click(screen.getByRole('button', { name: '生成文本' }));
    expect(
      (screen.getByLabelText('生成结果') as HTMLTextAreaElement).value.split('\n\n'),
    ).toHaveLength(3);
  });

  it('masks text with configurable visible ends', async () => {
    const user = userEvent.setup();
    render(<TextMaskTool />);
    fireEvent.change(screen.getByLabelText('原始文本'), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByLabelText('保留开头字符'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('保留结尾字符'), { target: { value: '2' } });
    await user.click(screen.getByRole('button', { name: '遮蔽文本' }));
    expect(screen.getByLabelText('遮蔽结果')).toHaveValue('12******90');
  });

  it('normalizes email without changing the local part', async () => {
    const user = userEvent.setup();
    render(<EmailNormalizerTool />);
    fireEvent.change(screen.getByLabelText('Email 地址'), {
      target: { value: '  User.Name@GMAIL.COM  ' },
    });
    await user.click(screen.getByRole('button', { name: '标准化 Email' }));
    expect(screen.getByLabelText('标准化结果')).toHaveValue('User.Name@gmail.com');
  });

  it('filters the regex reference as the user types', () => {
    render(<RegexCheatsheetTool />);
    expect(screen.getByText('\\d')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('搜索正则语法'), { target: { value: '前瞻' } });
    expect(screen.getByText('(?=...)')).toBeInTheDocument();
    expect(screen.queryByText('\\d')).not.toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  EmojiPickerTool,
  GitCommandsTool,
  NatoAlphabetTool,
  OutlookSafeLinkTool,
} from './parity-reference-more-tool-panels';

describe('additional reference panels', () => {
  it('converts NATO text in both directions', async () => {
    const user = userEvent.setup();
    render(<NatoAlphabetTool />);
    fireEvent.change(screen.getByLabelText('输入文本'), { target: { value: 'SOS' } });
    await user.click(screen.getByRole('button', { name: '字母 → NATO' }));
    expect(screen.getByLabelText('转换结果')).toHaveValue('Sierra Oscar Sierra');
    fireEvent.change(screen.getByLabelText('输入文本'), { target: { value: 'Alpha Bravo' } });
    await user.click(screen.getByRole('button', { name: 'NATO → 字母' }));
    expect(screen.getByLabelText('转换结果')).toHaveValue('AB');
  });

  it('shows decoded SafeLink as text and reports invalid input', async () => {
    const user = userEvent.setup();
    render(<OutlookSafeLinkTool />);
    fireEvent.change(screen.getByLabelText('Outlook SafeLink'), {
      target: {
        value: 'https://eur01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fexample.org%2F',
      },
    });
    await user.click(screen.getByRole('button', { name: '解码链接' }));
    expect(screen.getByLabelText('目标 URL')).toHaveValue('https://example.org/');
    expect(screen.queryByRole('link', { name: 'https://example.org/' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Outlook SafeLink'), { target: { value: 'not a URL' } });
    await user.click(screen.getByRole('button', { name: '解码链接' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('searches Git commands and copies a matching emoji', async () => {
    const user = userEvent.setup();
    const first = render(<GitCommandsTool />);
    fireEvent.change(screen.getByLabelText('搜索 Git 命令'), { target: { value: 'status' } });
    expect(screen.getByText('git status')).toBeInTheDocument();
    first.unmount();
    render(<EmojiPickerTool />);
    fireEvent.change(screen.getByLabelText('搜索 Emoji'), { target: { value: '爱心' } });
    await user.click(screen.getByRole('button', { name: /❤️/ }));
    expect(screen.getByRole('status')).toHaveTextContent('已复制 ❤️');
  });
});

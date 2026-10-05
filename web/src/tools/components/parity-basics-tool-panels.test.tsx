import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  BasicAuthTool,
  ChmodTool,
  HmacTool,
  HtmlEntitiesTool,
  NumeronymTool,
  RomanNumeralTool,
  TextDiffTool,
  TextStatsTool,
} from './parity-basics-tool-panels';

describe('IT-Tools 对标基础卡片', () => {
  it('HTML 实体转换后修改输入会清空旧结果', async () => {
    const user = userEvent.setup();
    render(<HtmlEntitiesTool />);
    fireEvent.change(screen.getByLabelText('输入文本'), { target: { value: '<a>&' } });
    await user.click(screen.getByRole('button', { name: '转义' }));
    expect(screen.getByLabelText('转换结果')).toHaveValue('&lt;a&gt;&amp;');
    fireEvent.change(screen.getByLabelText('输入文本'), { target: { value: 'new' } });
    expect(screen.getByLabelText('转换结果')).toHaveValue('');
  });

  it('文本差异区分删除与新增行', async () => {
    const user = userEvent.setup();
    render(<TextDiffTool />);
    fireEvent.change(screen.getByLabelText('原文本'), { target: { value: 'a\nb' } });
    fireEvent.change(screen.getByLabelText('新文本'), { target: { value: 'a\nc' } });
    await user.click(screen.getByRole('button', { name: '比较文本' }));
    expect(screen.getByText('− b')).toBeInTheDocument();
    expect(screen.getByText('+ c')).toBeInTheDocument();
  });

  it('HMAC 输出摘要，Basic Auth 输出请求头', async () => {
    const user = userEvent.setup();
    const view = render(<HmacTool />);
    fireEvent.change(screen.getByLabelText('密钥'), { target: { value: 'key' } });
    fireEvent.change(screen.getByLabelText('正文'), { target: { value: 'abc' } });
    await user.click(screen.getByRole('button', { name: '计算 HMAC' }));
    expect(await screen.findByLabelText('HMAC 摘要')).toHaveValue(
      '9c196e32dc0175f86f4b1cb89289d6619de6bee699e4c378e68309ed97a1a6ab',
    );
    view.unmount();
    render(<BasicAuthTool />);
    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'user' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'pass' } });
    await user.click(screen.getByRole('button', { name: '生成请求头' }));
    expect(screen.getByLabelText('Authorization 请求头')).toHaveValue('Basic dXNlcjpwYXNz');
  });

  it('其余计算卡片能输出可复制结果', async () => {
    const user = userEvent.setup();
    const views = [
      [<ChmodTool key="chmod" />, '计算权限', 'rwxr-xr-x'],
      [<RomanNumeralTool key="roman" />, '转为罗马数字', 'MCMXCIV'],
      [<TextStatsTool key="stats" />, '统计文本', '字符'],
      [<NumeronymTool key="numeronym" />, '生成缩写', 'i18n'],
    ] as const;
    for (const [component, button, expected] of views) {
      const view = render(component);
      await user.click(screen.getByRole('button', { name: button }));
      expect((screen.getByLabelText('转换结果') as HTMLTextAreaElement).value).toContain(expected);
      view.unmount();
    }
  });
});

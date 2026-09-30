import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  ColorTool,
  MarkdownTool,
  PasswordTool,
  SqlTool,
  UserAgentTool,
} from './second-batch-tool-panels';

describe('第二批工具界面', () => {
  it('Markdown 源文本、HTML 与安全预览各自可见', async () => {
    const user = userEvent.setup();
    render(<MarkdownTool />);
    await user.clear(screen.getByLabelText('Markdown 源文本'));
    await user.type(screen.getByLabelText('Markdown 源文本'), '# 标题');
    await user.click(screen.getByRole('button', { name: '转换 Markdown' }));
    expect((screen.getByLabelText('生成的 HTML') as HTMLTextAreaElement).value.trim()).toBe(
      '<h1>标题</h1>',
    );
    expect(screen.getByRole('region', { name: '安全预览' })).toHaveTextContent('标题');
  });
  it('SQL 格式化仅展示文本结果并反馈错误', async () => {
    const user = userEvent.setup();
    render(<SqlTool />);
    await user.clear(screen.getByLabelText('SQL 输入'));
    await user.type(screen.getByLabelText('SQL 输入'), "select 'oops");
    await user.click(screen.getByRole('button', { name: '格式化 SQL' }));
    expect(screen.getByRole('alert')).toHaveTextContent('引号未闭合');
  });
  it('密码生成后展示强度并可清除旧结果', async () => {
    const user = userEvent.setup();
    render(<PasswordTool />);
    await user.click(screen.getByRole('button', { name: '生成密码' }));
    expect((screen.getByLabelText('密码（可输入或生成）') as HTMLInputElement).value).toHaveLength(
      20,
    );
    expect(screen.getByText(/强度：/)).toBeInTheDocument();
  });
  it('可手动输入密码并分析强度', async () => {
    const user = userEvent.setup();
    render(<PasswordTool />);
    await user.type(screen.getByLabelText('密码（可输入或生成）'), 'password123');
    expect(screen.getByText(/强度：弱/)).toBeInTheDocument();
  });
  it('颜色转换显示颜色值和预览', async () => {
    const user = userEvent.setup();
    render(<ColorTool />);
    await user.click(screen.getByRole('button', { name: '转换颜色' }));
    expect(screen.getByText('#FF0000')).toBeInTheDocument();
    expect(screen.getByLabelText('颜色预览')).toHaveStyle({ backgroundColor: '#FF0000' });
  });
  it('未知 UA 显示未知字段', async () => {
    const user = userEvent.setup();
    render(<UserAgentTool />);
    await user.clear(screen.getByLabelText('User-Agent 文本'));
    await user.type(screen.getByLabelText('User-Agent 文本'), 'mystery-client/1.0');
    await user.click(screen.getByRole('button', { name: '解析 User-Agent' }));
    expect(screen.getAllByText('未知')).toHaveLength(3);
  });
});

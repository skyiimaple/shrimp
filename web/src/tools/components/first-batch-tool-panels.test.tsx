import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RadixTool } from './developer-tool-panels';
import { JsonTomlTool, YamlJsonTool } from './structured-data-tool-panels';
import { ListTool, TextCaseTool, UrlTool } from './text-tool-panels';

describe('结构化数据工具', () => {
  it('把 YAML 转成 JSON 并展示解析错误', async () => {
    const user = userEvent.setup();
    render(<YamlJsonTool />);
    await user.click(screen.getByRole('button', { name: '转为 JSON' }));
    expect((screen.getByLabelText('转换结果') as HTMLTextAreaElement).value).toContain('"name"');
    await user.clear(screen.getByLabelText('YAML 或 JSON 输入'));
    fireEvent.change(screen.getByLabelText('YAML 或 JSON 输入'), { target: { value: 'name: [' } });
    await user.click(screen.getByRole('button', { name: '转为 JSON' }));
    expect(screen.getByRole('alert')).toHaveTextContent('YAML 格式无效');
    expect(screen.getByLabelText('转换结果')).toHaveValue('');
  });

  it('在 JSON 和 TOML 间转换', async () => {
    const user = userEvent.setup();
    render(<JsonTomlTool />);
    await user.click(screen.getByRole('button', { name: '转为 TOML' }));
    expect((screen.getByLabelText('转换结果') as HTMLTextAreaElement).value).toContain('[server]');
  });
});

describe('文本工具', () => {
  it('编码 URL 并解析查询参数', async () => {
    const user = userEvent.setup();
    render(<UrlTool />);
    await user.click(screen.getByRole('button', { name: '编码组件' }));
    expect((screen.getByLabelText('处理结果') as HTMLTextAreaElement).value).toContain('%');
    await user.clear(screen.getByLabelText('URL 或文本'));
    await user.type(screen.getByLabelText('URL 或文本'), '?a=1&a=2');
    await user.click(screen.getByRole('button', { name: '解析查询参数' }));
    expect(screen.getAllByText('a')).toHaveLength(2);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('查询参数已更新，共 2 项');
  });

  it('解码失败时清除旧 URL 结果', async () => {
    const user = userEvent.setup();
    render(<UrlTool />);
    await user.click(screen.getByRole('button', { name: '编码组件' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'URL 或文本' }), {
      target: { value: '%' },
    });
    await user.click(screen.getByRole('button', { name: '解码组件' }));
    expect(screen.getByRole('alert')).toHaveTextContent('URL 编码无效');
    expect(screen.getByLabelText('处理结果')).toHaveValue('');
  });

  it('转换文本命名格式', async () => {
    const user = userEvent.setup();
    render(<TextCaseTool />);
    await user.click(screen.getByRole('combobox', { name: '目标格式' }));
    await user.click(screen.getByRole('option', { name: 'snake_case' }));
    expect(screen.getByLabelText('转换结果')).toHaveValue('hello_world');
  });

  it('去重排序列表并展示统计', async () => {
    const user = userEvent.setup();
    render(<ListTool />);
    await user.click(screen.getByRole('button', { name: '处理列表' }));
    expect(screen.getByLabelText('处理结果')).toHaveValue('apple\nbanana\npear');
    expect(screen.getByText('发现重复 1 项')).toBeInTheDocument();
  });
});

describe('进制转换工具', () => {
  it('把十进制整数转成十六进制', async () => {
    const user = userEvent.setup();
    render(<RadixTool />);
    await user.click(screen.getByRole('button', { name: '转换进制' }));
    expect(screen.getByLabelText('转换结果')).toHaveValue('FF');
    await user.click(screen.getByRole('combobox', { name: '目标进制' }));
    await user.click(screen.getByRole('option', { name: /二进制/ }));
    expect(screen.getByLabelText('转换结果')).toHaveValue('');
    await user.click(screen.getByRole('combobox', { name: '目标进制' }));
    await user.click(screen.getByRole('option', { name: /十六进制/ }));
    await user.click(screen.getByRole('button', { name: '转换进制' }));
    fireEvent.change(screen.getByRole('textbox', { name: '待转换整数' }), {
      target: { value: 'GG' },
    });
    await user.click(screen.getByRole('button', { name: '转换进制' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByLabelText('转换结果')).toHaveValue('');
  });
});

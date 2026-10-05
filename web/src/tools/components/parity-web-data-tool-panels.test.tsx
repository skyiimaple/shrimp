import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  OgMetaTool,
  PercentageTool,
  SvgPlaceholderTool,
  YamlFormatTool,
  YamlTomlTool,
} from './parity-web-data-tool-panels';

describe('IT-Tools 对标 Web 与数据卡片', () => {
  it('YAML 转 TOML 与格式化保留可复制输出', async () => {
    const user = userEvent.setup();
    const first = render(<YamlTomlTool />);
    fireEvent.change(screen.getByLabelText('输入内容'), { target: { value: 'name: Shrimp' } });
    await user.click(screen.getByRole('button', { name: 'YAML → TOML' }));
    expect(screen.getByLabelText('转换结果')).toHaveValue('name = "Shrimp"');
    first.unmount();
    render(<YamlFormatTool />);
    fireEvent.change(screen.getByLabelText('YAML 输入'), { target: { value: '# hi\na:   1' } });
    await user.click(screen.getByRole('button', { name: '格式化 YAML' }));
    expect(screen.getByLabelText('转换结果')).toHaveValue('# hi\na: 1');
  });

  it('OG 标签与 SVG 占位图安全转义输入', async () => {
    const user = userEvent.setup();
    const first = render(<OgMetaTool />);
    fireEvent.change(screen.getByLabelText('标题'), { target: { value: 'A "title"' } });
    await user.click(screen.getByRole('button', { name: '生成标签' }));
    expect((screen.getByLabelText('转换结果') as HTMLTextAreaElement).value).toContain(
      '&quot;title&quot;',
    );
    first.unmount();
    render(<SvgPlaceholderTool />);
    fireEvent.change(screen.getByLabelText('标签文本'), { target: { value: '<hello>' } });
    await user.click(screen.getByRole('button', { name: '生成 SVG' }));
    expect((screen.getByLabelText('转换结果') as HTMLTextAreaElement).value).toContain(
      '&lt;hello&gt;',
    );
  });

  it('百分比卡片提供两种计算方式', async () => {
    const user = userEvent.setup();
    render(<PercentageTool />);
    fireEvent.change(screen.getByLabelText('数值 A'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('数值 B'), { target: { value: '80' } });
    await user.click(screen.getByRole('button', { name: 'A 是 B 的百分之几' }));
    expect(screen.getByLabelText('转换结果')).toHaveValue('25%');
  });
});

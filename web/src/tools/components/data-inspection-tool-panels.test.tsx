import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CsvJsonTool, JsonDiffTool } from './data-inspection-tool-panels';

describe('数据检查工具界面', () => {
  it('JSON 对比显示差异路径和可复制的 Patch', async () => {
    const user = userEvent.setup();
    render(<JsonDiffTool />);
    fireEvent.change(screen.getByLabelText('左侧 JSON'), { target: { value: '{"a":1}' } });
    fireEvent.change(screen.getByLabelText('右侧 JSON'), { target: { value: '{"a":2}' } });
    await user.click(screen.getByRole('button', { name: '比较差异' }));
    expect(screen.getByText('/a')).toBeInTheDocument();
    expect((screen.getByLabelText('JSON Patch') as HTMLTextAreaElement).value).toContain(
      '"replace"',
    );
  });

  it('CSV 转 JSON 保留文本值，修改输入后清除旧结果', async () => {
    const user = userEvent.setup();
    render(<CsvJsonTool />);
    fireEvent.change(screen.getByLabelText('输入内容'), { target: { value: 'id,name\n001,Ada' } });
    await user.click(screen.getByRole('button', { name: 'CSV → JSON' }));
    expect((screen.getByLabelText('转换结果') as HTMLTextAreaElement).value).toContain('"001"');
    await user.type(screen.getByLabelText('输入内容'), 'x');
    expect((screen.getByLabelText('转换结果') as HTMLTextAreaElement).value).toBe('');
  });
});

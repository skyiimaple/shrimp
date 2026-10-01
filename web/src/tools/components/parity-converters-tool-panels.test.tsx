import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  BinaryTextTool,
  RandomPortTool,
  SlugifyTool,
  TemperatureTool,
  UlidTool,
  UnicodeTextTool,
} from './parity-converters-tool-panels';

describe('IT-Tools 对标转换卡片', () => {
  it('ULID 与随机端口可生成可复制结果', async () => {
    const user = userEvent.setup();
    const first = render(<UlidTool />);
    await user.click(screen.getByRole('button', { name: '生成 ULID' }));
    expect((screen.getByLabelText('转换结果') as HTMLTextAreaElement).value).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    first.unmount();
    render(<RandomPortTool />);
    await user.click(screen.getByRole('button', { name: '生成端口' }));
    expect(Number((screen.getByLabelText('转换结果') as HTMLTextAreaElement).value)).toBeGreaterThanOrEqual(49152);
  });

  it('二进制与 Unicode 卡片可双向转换', async () => {
    const user = userEvent.setup();
    const first = render(<BinaryTextTool />);
    fireEvent.change(screen.getByLabelText('输入文本'), { target: { value: 'A' } });
    await user.click(screen.getByRole('button', { name: '转为二进制' }));
    expect(screen.getByLabelText('转换结果')).toHaveValue('01000001');
    first.unmount();
    render(<UnicodeTextTool />);
    fireEvent.change(screen.getByLabelText('输入文本'), { target: { value: '😀' } });
    await user.click(screen.getByRole('button', { name: '转为 Unicode' }));
    expect(screen.getByLabelText('转换结果')).toHaveValue('U+1F600');
  });

  it('Slug 与温度卡片输出结果', async () => {
    const user = userEvent.setup();
    const first = render(<SlugifyTool />);
    fireEvent.change(screen.getByLabelText('输入文本'), { target: { value: 'Café & 你好' } });
    await user.click(screen.getByRole('button', { name: '生成 Slug' }));
    expect(screen.getByLabelText('转换结果')).toHaveValue('cafe-你好');
    first.unmount();
    render(<TemperatureTool />);
    await user.click(screen.getByRole('button', { name: '转换温度' }));
    expect(screen.getByLabelText('转换结果')).toHaveValue('32 °F');
  });
});

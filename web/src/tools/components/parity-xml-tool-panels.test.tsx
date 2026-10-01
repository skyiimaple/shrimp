import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { JsonToXmlTool, XmlFormatTool, XmlToJsonTool } from './parity-xml-tool-panels';

describe('XML tool panels', () => {
  it('formats XML and shows validation errors', async () => {
    const user = userEvent.setup();
    render(<XmlFormatTool />);
    fireEvent.change(screen.getByLabelText('XML 输入'), {
      target: { value: '<root><item>A</item></root>' },
    });
    await user.click(screen.getByRole('button', { name: '格式化 XML' }));
    expect(screen.getByLabelText('转换结果')).toHaveValue('<root>\n  <item>A</item>\n</root>');
    fireEvent.change(screen.getByLabelText('XML 输入'), { target: { value: '<root>' } });
    await user.click(screen.getByRole('button', { name: '校验 XML' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('converts XML to JSON and JSON back to XML', async () => {
    const user = userEvent.setup();
    const first = render(<XmlToJsonTool />);
    expect(screen.getByText(/@ 表示属性/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('XML 输入'), {
      target: { value: '<root id="x"><item>A</item><item>B</item></root>' },
    });
    await user.click(screen.getByRole('button', { name: 'XML 转 JSON' }));
    expect(JSON.parse((screen.getByLabelText('转换结果') as HTMLTextAreaElement).value)).toEqual({
      root: { '@id': 'x', item: ['A', 'B'] },
    });
    first.unmount();
    render(<JsonToXmlTool />);
    fireEvent.change(screen.getByLabelText('JSON 输入'), {
      target: { value: '{"root":{"@id":"x","item":["A","B"]}}' },
    });
    await user.click(screen.getByRole('button', { name: 'JSON 转 XML' }));
    expect(screen.getByLabelText('转换结果')).toHaveValue(
      '<root id="x">\n  <item>A</item>\n  <item>B</item>\n</root>',
    );
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HtmlEditorTool } from './parity-html-editor-tool-panel';

describe('HTML 编辑卡片', () => {
  it('从可编辑区域输出清理后的 HTML', () => {
    render(<HtmlEditorTool />);
    const editor = screen.getByRole('textbox', { name: '可视化编辑区' });
    editor.innerHTML = '<p>你好</p><img src=x onerror=alert(1)>';
    fireEvent.input(editor);
    expect((screen.getByLabelText('HTML 源码') as HTMLTextAreaElement).value).toBe(
      '<p>你好</p><img src="x">',
    );
  });
});

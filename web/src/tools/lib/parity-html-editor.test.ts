import { describe, expect, it } from 'vitest';
import { sanitizeEditorHtml } from './parity-html-editor';

describe('HTML 编辑器', () => {
  it('保留普通排版并删除脚本、事件处理器与危险链接', () => {
    expect(
      sanitizeEditorHtml(
        '<p onclick="alert(1)"><strong>你好</strong><script>alert(1)</script><a href="javascript:alert(1)">链接</a></p>',
      ),
    ).toBe('<p><strong>你好</strong><a>链接</a></p>');
  });
});

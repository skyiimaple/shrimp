import { describe, expect, it } from 'vitest';
import { markdownToHtml } from './markdown';

describe('Markdown 转 HTML', () => {
  it('保留常见格式并阻止脚本、事件属性和危险链接', () => {
    const result = markdownToHtml(
      '# 标题\n\n[安全](https://example.com) [危险](javascript:alert(1))\n\n<img src=x onerror=alert(1)><script>alert(1)</script>',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toContain('<h1>标题</h1>');
    expect(result.value).toContain('href="https://example.com"');
    expect(result.value).not.toMatch(/<script|onerror|javascript:/i);
  });
});

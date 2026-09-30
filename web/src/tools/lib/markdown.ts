import DOMPurify from 'dompurify';
import { marked } from 'marked';
import type { Result } from './result';

export function markdownToHtml(input: string): Result<string> {
  try {
    const raw = marked.parse(input, { async: false }) as string;
    return { ok: true, value: DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } }) };
  } catch {
    return { ok: false, error: 'Markdown 转换失败，请检查输入内容' };
  }
}

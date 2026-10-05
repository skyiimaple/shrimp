import DOMPurify from 'dompurify';

export function sanitizeEditorHtml(raw: string): string {
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
}

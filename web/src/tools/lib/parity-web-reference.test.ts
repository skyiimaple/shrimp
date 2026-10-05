import { describe, expect, it } from 'vitest';
import { findHttpStatuses, findMimeTypes } from './parity-web-reference';

describe('Web reference lookups', () => {
  it('finds common MIME types from extensions and MIME names without case sensitivity', () => {
    expect(findMimeTypes('.PNG').map((entry) => entry.mime)).toContain('image/png');
    expect(findMimeTypes('application/json').map((entry) => entry.extensions)).toContainEqual([
      'json',
    ]);
    expect(findMimeTypes('unknown-extension')).toEqual([]);
  });

  it('finds standard HTTP statuses by code and phrase', () => {
    expect(findHttpStatuses('404')).toEqual([
      { code: 404, name: 'Not Found', description: '请求的资源不存在。' },
    ]);
    expect(findHttpStatuses('not found').map((status) => status.code)).toContain(404);
    expect(findHttpStatuses('999')).toEqual([]);
  });
});

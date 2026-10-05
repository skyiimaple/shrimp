import { describe, expect, it } from 'vitest';
import { fileToBase64 } from './parity-file-base64';

describe('Base64 文件转换', () => {
  it('保留 MIME 类型并将文件字节编码为 Data URL', async () => {
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    expect(await fileToBase64(file)).toBe('data:text/plain;base64,aGVsbG8=');
  });

  it('拒绝过大的文件', async () => {
    const file = new File([new Uint8Array(5_000_001)], 'large.bin');
    await expect(fileToBase64(file)).rejects.toThrow('5 MB');
  });
});

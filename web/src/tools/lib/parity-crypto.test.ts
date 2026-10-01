import { describe, expect, it } from 'vitest';
import {
  decryptText,
  encryptText,
  generateRsaKeyPair,
  generateTotpSecret,
  totp,
} from './parity-crypto';

describe('IT-Tools 对标浏览器加密工具', () => {
  it('AES-GCM 往返保留 Unicode 文本，错误口令无法解密', async () => {
    const encrypted = await encryptText('你好 😀', 'correct horse battery staple');
    expect(encrypted).toMatch(/^shrimp:aes-gcm:v1:/);
    expect(await decryptText(encrypted, 'correct horse battery staple')).toBe('你好 😀');
    await expect(decryptText(encrypted, 'wrong')).rejects.toThrow('解密失败');
  });

  it('相同口令和文本每次产生不同密文', async () => {
    const first = await encryptText('secret', 'password');
    const second = await encryptText('secret', 'password');
    expect(first).not.toBe(second);
  });

  it('TOTP 匹配 RFC 6238 SHA-1 测试向量', async () => {
    expect(await totp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 59, 8)).toBe('94287082');
    expect(generateTotpSecret()).toMatch(/^[A-Z2-7]{32}$/);
    await expect(totp('invalid!', 59)).rejects.toThrow('Base32');
  });

  it('RSA 公钥和私钥可导出 PEM', async () => {
    const pair = await generateRsaKeyPair();
    expect(pair.publicKey).toMatch(/^-----BEGIN PUBLIC KEY-----/);
    expect(pair.privateKey).toMatch(/^-----BEGIN PRIVATE KEY-----/);
  });
});

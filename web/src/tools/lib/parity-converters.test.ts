import { describe, expect, it } from 'vitest';
import {
  binaryToText,
  convertTemperature,
  generateUlid,
  randomPort,
  slugify,
  textToBinary,
  textToUnicode,
  unicodeToText,
} from './parity-converters';

describe('IT-Tools 对标转换工具', () => {
  it('ULID 保留时间前缀，并使用 Crockford 字母表', () => {
    expect(generateUlid(0)).toMatch(/^0{10}[0-9A-HJKMNP-TV-Z]{16}$/);
    expect(() => generateUlid(-1)).toThrow('时间');
  });

  it('随机端口在动态端口范围内', () => {
    for (let index = 0; index < 20; index++) {
      const value = randomPort();
      expect(value).toBeGreaterThanOrEqual(49152);
      expect(value).toBeLessThanOrEqual(65535);
    }
  });

  it('二进制与 UTF-8 文本双向转换，拒绝无效字节', () => {
    expect(textToBinary('A中')).toBe('01000001 11100100 10111000 10101101');
    expect(binaryToText('01000001 11100100 10111000 10101101')).toBe('A中');
    expect(() => binaryToText('11111111')).toThrow('UTF-8');
  });

  it('Unicode 转义支持补充平面字符', () => {
    expect(textToUnicode('A😀')).toBe('U+0041 U+1F600');
    expect(unicodeToText('U+0041 U+1F600')).toBe('A😀');
    expect(() => unicodeToText('U+D800')).toThrow('码点');
  });

  it('slugify 清理重音、重复分隔符并保留 Unicode 字母', () => {
    expect(slugify('  Café & 你好 World!  ')).toBe('cafe-你好-world');
  });

  it('温度转换处理常见标尺并拒绝绝对零度以下', () => {
    expect(convertTemperature(0, 'C', 'F')).toBe(32);
    expect(convertTemperature(32, 'F', 'K')).toBe(273.15);
    expect(() => convertTemperature(-1, 'K', 'C')).toThrow('绝对零度');
  });
});

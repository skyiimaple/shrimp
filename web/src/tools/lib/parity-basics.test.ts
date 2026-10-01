import { describe, expect, it } from 'vitest';
import {
  basicAuthHeader,
  chmodInfo,
  decodeHtmlEntities,
  diffTextLines,
  encodeHtmlEntities,
  hmacHex,
  numeronym,
  romanToInteger,
  integerToRoman,
  textStats,
} from './parity-basics';

describe('IT-Tools 对标基础工具', () => {
  it('HTML 实体编解码只处理文本，不把结果作为 HTML 执行', () => {
    expect(encodeHtmlEntities(`<a title="Tom & Jerry">'Hi'</a>`)).toBe(
      '&lt;a title=&quot;Tom &amp; Jerry&quot;&gt;&#39;Hi&#39;&lt;/a&gt;',
    );
    expect(decodeHtmlEntities('&lt;tag&gt; &#x1F600; &#65; &unknown;')).toBe(
      '<tag> 😀 A &unknown;',
    );
  });

  it('按行比较文本并保留重复行顺序', () => {
    expect(diffTextLines('a\nb\na', 'a\nc\na')).toEqual([
      { kind: 'same', value: 'a' },
      { kind: 'removed', value: 'b' },
      { kind: 'added', value: 'c' },
      { kind: 'same', value: 'a' },
    ]);
  });

  it('HMAC 使用 UTF-8 密钥和正文，输出标准十六进制摘要', async () => {
    expect(await hmacHex('key', 'The quick brown fox jumps over the lazy dog', 'SHA-256')).toBe(
      'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8',
    );
  });

  it('Basic Auth 对非 ASCII 用户名和密码按 UTF-8 编码', () => {
    expect(basicAuthHeader('测试', 'päss')).toBe('Basic 5rWL6K+VOnDDpHNz');
    expect(() => basicAuthHeader('a:b', 'pass')).toThrow('冒号');
  });

  it('chmod 显示八进制和符号权限，并拒绝无效权限', () => {
    expect(chmodInfo('755')).toEqual({ octal: '755', symbolic: 'rwxr-xr-x' });
    expect(chmodInfo('0644')).toEqual({ octal: '644', symbolic: 'rw-r--r--' });
    expect(() => chmodInfo('888')).toThrow('权限');
  });

  it('罗马数字双向转换并拒绝非规范写法', () => {
    expect(integerToRoman(1994)).toBe('MCMXCIV');
    expect(romanToInteger('MCMXCIV')).toBe(1994);
    expect(() => romanToInteger('IIII')).toThrow('罗马');
    expect(() => integerToRoman(4000)).toThrow('1 到 3999');
  });

  it('文本统计和数字缩写按 Unicode 字符处理', () => {
    expect(textStats('Hi 😀\n你好')).toEqual({ characters: 7, words: 2, lines: 2, bytes: 14 });
    expect(numeronym('internationalization')).toBe('i18n');
    expect(numeronym('猫')).toBe('猫');
  });
});

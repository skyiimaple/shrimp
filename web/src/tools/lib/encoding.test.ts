import { describe, expect, it } from 'vitest';
import {
  convertRadix,
  decodeUrlComponent,
  encodeUrlComponent,
  parseQueryParameters,
} from './encoding';

describe('URL 工具', () => {
  it('正确编码和解码 Unicode URL 组件', () => {
    const encoded = encodeUrlComponent('虾米 tools?');
    expect(encoded).toBe('%E8%99%BE%E7%B1%B3%20tools%3F');
    expect(decodeUrlComponent(encoded)).toEqual({ ok: true, value: '虾米 tools?' });
  });

  it('拒绝不完整的百分号编码', () => {
    expect(decodeUrlComponent('%E8%99')).toEqual({ ok: false, error: 'URL 编码无效' });
  });

  it('解析完整 URL、重复参数、空值和加号空格', () => {
    expect(
      parseQueryParameters('https://example.com/path?a=1&a=2&name=%E8%99%BE%E7%B1%B3+tools&empty='),
    ).toEqual({
      ok: true,
      value: [
        { key: 'a', value: '1' },
        { key: 'a', value: '2' },
        { key: 'name', value: '虾米 tools' },
        { key: 'empty', value: '' },
      ],
    });
  });

  it('区分没有查询参数的完整 URL 与包含问号的裸查询值', () => {
    expect(parseQueryParameters('https://example.com/path')).toEqual({ ok: true, value: [] });
    expect(parseQueryParameters('note=what?yes')).toEqual({
      ok: true,
      value: [{ key: 'note', value: 'what?yes' }],
    });
  });
});

describe('进制转换', () => {
  it('在二、八、十、十六进制间转换大整数和负数', () => {
    expect(convertRadix('11111111111111111111111111111111111111111111111111111', 2, 16)).toEqual({
      ok: true,
      value: '1FFFFFFFFFFFFF',
    });
    expect(convertRadix('-255', 10, 16)).toEqual({ ok: true, value: '-FF' });
    expect(convertRadix('ff', 16, 2)).toEqual({ ok: true, value: '11111111' });
  });

  it('拒绝空输入和不属于来源进制的字符', () => {
    expect(convertRadix('', 10, 2)).toEqual({ ok: false, error: '请输入要转换的整数' });
    expect(convertRadix('102', 2, 10)).toEqual({ ok: false, error: '输入不是有效的二进制整数' });
  });
});

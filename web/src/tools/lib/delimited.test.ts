import { describe, expect, it } from 'vitest';
import { delimitedToJson, jsonToDelimited } from './delimited';

describe('CSV/TSV ⇄ JSON', () => {
  it('CSV 正确处理引号、逗号、单元格换行，并保留前导零', () => {
    const input = 'id,note\r\n001,"hello, ""world""\nagain"\r\n002,plain\r\n';
    expect(delimitedToJson(input, ',')).toEqual({
      ok: true,
      value:
        '[\n  {\n    "id": "001",\n    "note": "hello, \\"world\\"\\nagain"\n  },\n  {\n    "id": "002",\n    "note": "plain"\n  }\n]',
    });
  });

  it('TSV 双向转换，导出时正确引用含分隔符的字段', () => {
    expect(delimitedToJson('name\tvalue\nfoo\tbar', '\t')).toEqual({
      ok: true,
      value: '[\n  {\n    "name": "foo",\n    "value": "bar"\n  }\n]',
    });
    expect(
      jsonToDelimited('[{"name":"foo","value":"a\\tb"},{"name":"bar","extra":2}]', '\t'),
    ).toEqual({
      ok: true,
      value: 'name\tvalue\textra\r\nfoo\t"a\tb"\t\r\nbar\t\t2',
    });
  });

  it('拒绝不完整引号、重复表头和列数不一致的行', () => {
    expect(delimitedToJson('a,b\n"x,y', ',')).toMatchObject({ ok: false });
    expect(delimitedToJson('a,a\n1,2', ',')).toMatchObject({ ok: false });
    expect(delimitedToJson('a,b\n1', ',')).toMatchObject({ ok: false });
  });

  it('JSON 导出要求对象数组，不隐式转换嵌套值', () => {
    expect(jsonToDelimited('{"a":1}', ',')).toMatchObject({ ok: false });
    expect(jsonToDelimited('[{"a":{"x":1}}]', ',')).toMatchObject({ ok: false });
  });
});

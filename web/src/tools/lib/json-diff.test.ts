import { describe, expect, it } from 'vitest';
import { diffJson } from './json-diff';

describe('JSON 差异对比', () => {
  it('按字段路径展示增删改，并生成可应用的 JSON Patch', () => {
    const result = diffJson(
      '{"name":"old","nested":{"gone":true,"same":1},"items":[1,2,3]}',
      '{"name":"new","nested":{"added":null,"same":1},"items":[1]}',
    );
    expect(result).toEqual({
      ok: true,
      value: {
        changes: [
          { path: '/items/1', kind: 'removed', before: 2 },
          { path: '/items/2', kind: 'removed', before: 3 },
          { path: '/name', kind: 'changed', before: 'old', after: 'new' },
          { path: '/nested/added', kind: 'added', after: null },
          { path: '/nested/gone', kind: 'removed', before: true },
        ],
        patch: [
          { op: 'remove', path: '/items/2' },
          { op: 'remove', path: '/items/1' },
          { op: 'replace', path: '/name', value: 'new' },
          { op: 'add', path: '/nested/added', value: null },
          { op: 'remove', path: '/nested/gone' },
        ],
      },
    });
  });

  it('忽略对象键顺序，并转义 JSON Pointer 中的斜杠与波浪号', () => {
    expect(diffJson('{"b":2,"a":1}', '{"a":1,"b":2}')).toEqual({
      ok: true,
      value: { changes: [], patch: [] },
    });
    expect(diffJson('{"a/b~c":1}', '{"a/b~c":2}')).toMatchObject({
      ok: true,
      value: { patch: [{ op: 'replace', path: '/a~1b~0c', value: 2 }] },
    });
  });

  it('无效 JSON 指出是哪一侧', () => {
    expect(diffJson('{', '{}')).toEqual({ ok: false, error: '左侧 JSON 格式无效' });
    expect(diffJson('{}', '{')).toEqual({ ok: false, error: '右侧 JSON 格式无效' });
  });

  it('把与对象原型同名的字段视为真实新增字段', () => {
    expect(diffJson('{}', '{"toString":1}')).toMatchObject({
      ok: true,
      value: {
        changes: [{ path: '/toString', kind: 'added', after: 1 }],
        patch: [{ op: 'add', path: '/toString', value: 1 }],
      },
    });
  });
});

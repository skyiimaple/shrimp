import { describe, expect, it } from 'vitest';
import { decodeBase64Utf8, encodeBase64Utf8 } from './base64';
import { analyzeCron } from './cron';
import { hashText } from './hash';
import { formatJson, minifyJson } from './json';
import { decodeJwt } from './jwt';
import { advanceStringIndex, runRegex } from './regex';
import { fromIso, parseTimestamp } from './timestamp';
import { generateUuidBatch } from './uuid';

describe('工具领域函数', () => {
  it('格式化、压缩并拒绝非法 JSON', () => {
    expect(formatJson('{"a":1}', 2)).toEqual({ ok: true, value: '{\n  "a": 1\n}' });
    expect(minifyJson('{ "a": 1 }')).toEqual({ ok: true, value: '{"a":1}' });
    expect(formatJson('{bad', 2)).toEqual({
      ok: false,
      error: 'JSON 格式无效（第 1 行，第 2 列）',
    });
  });
  it('严格处理 UTF-8 Base64', () => {
    expect(encodeBase64Utf8('虾米')).toBe('6Jm+57Gz');
    expect(decodeBase64Utf8('6Jm+57Gz')).toEqual({ ok: true, value: '虾米' });
    expect(decodeBase64Utf8('%%%')).toMatchObject({ ok: false });
  });
  it('解码 JWT 但拒绝错误结构', () => {
    expect(decodeJwt('eyJhbGciOiJub25lIn0.eyJzdWIiOiLmtYvor5UifQ.')).toMatchObject({
      ok: true,
      value: { header: { alg: 'none' }, payload: { sub: '测试' } },
    });
    expect(decodeJwt('only.two')).toMatchObject({ ok: false });
  });
  it('计算已知 SHA-256', async () => {
    expect(await hashText('abc', 'SHA-256')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
  it('转换秒、毫秒和 ISO 时间', () => {
    expect(parseTimestamp('0', 'seconds')).toMatchObject({
      ok: true,
      value: { iso: '1970-01-01T00:00:00.000Z', milliseconds: 0 },
    });
    expect(parseTimestamp('nope', 'milliseconds')).toMatchObject({ ok: false });
    expect(fromIso('1970-01-01T00:00:00Z')).toMatchObject({ ok: true, value: { seconds: 0 } });
    expect(fromIso('2026-02-30')).toEqual({ ok: false, error: '请输入有效的日期或时间戳' });
  });
  it('限制 UUID 批量并生成 v4', () => {
    expect(generateUuidBatch(0)).toEqual({ ok: false, error: '生成数量必须在 1 到 100 之间' });
    expect(generateUuidBatch(2)).toMatchObject({
      ok: true,
      value: [expect.stringMatching(/^[0-9a-f-]{36}$/), expect.any(String)],
    });
  });
  it('解析标准五段 Cron', () => {
    expect(analyzeCron('*/15 * * * *', new Date('2026-01-01T00:00:00Z'), 2)).toMatchObject({
      ok: true,
      value: { nextRuns: ['2026-01-01T00:15:00.000Z', '2026-01-01T00:30:00.000Z'] },
    });
    expect(analyzeCron('0 0 0 * * *', new Date(), 5)).toMatchObject({ ok: false });
    expect(analyzeCron('99 * * * *', new Date(), 5)).toEqual({
      ok: false,
      error: '分钟字段超出允许范围 0–59',
    });
  });
  it('枚举正则捕获组并拒绝重复 flag', () => {
    expect(runRegex('(虾)(米)', 'g', '虾米虾米')).toMatchObject({
      ok: true,
      value: [{ match: '虾米', index: 0, groups: ['虾', '米'] }, { index: 2 }],
    });
    expect(runRegex('a', 'gg', 'a')).toMatchObject({ ok: false });
  });
  it('Unicode 模式的空匹配跨过完整码点，避免 emoji 上死循环', () => {
    expect(advanceStringIndex('😀', 0, true)).toBe(2);
    expect(runRegex('(?:)', 'gu', '😀')).toEqual({
      ok: true,
      value: [
        { match: '', index: 0, groups: [] },
        { match: '', index: 2, groups: [] },
      ],
    });
  });
});

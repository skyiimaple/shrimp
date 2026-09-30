import { describe, expect, it } from 'vitest';
import { formatSql } from './sql';

describe('SQL 格式化', () => {
  it('排版常见查询且保留原查询内容', () => {
    const result = formatSql('select id,name from users where active=1 order by name');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toContain('SELECT');
    expect(result.value).toContain('\nFROM\n  users');
    expect(result.value).toContain('\nWHERE');
    expect(result.value).toContain('ORDER BY\n  name');
  });
  it('拒绝空输入和未闭合引号', () => {
    expect(formatSql(' ')).toMatchObject({ ok: false });
    expect(formatSql("select 'oops")).toMatchObject({ ok: false });
  });
  it('拒绝括号不匹配', () => {
    expect(formatSql('select (id from users')).toEqual({ ok: false, error: 'SQL 括号不匹配' });
    expect(formatSql('select id) from users')).toEqual({ ok: false, error: 'SQL 括号不匹配' });
  });
});

import { describe, expect, it } from 'vitest';
import {
  formatYaml,
  generateOgTags,
  generateSvgPlaceholder,
  percentOf,
  percentShare,
  tomlToYaml,
  yamlToToml,
} from './parity-web-data';

describe('IT-Tools 对标数据与 Web 工具', () => {
  it('YAML 与 TOML 双向转换，拒绝无法表示的 null', () => {
    expect(yamlToToml('name: Shrimp\nserver:\n  port: 8080')).toEqual({
      ok: true,
      value: 'name = "Shrimp"\n\n[server]\nport = 8080',
    });
    expect(tomlToYaml('name = "Shrimp"')).toEqual({ ok: true, value: 'name: Shrimp' });
    expect(yamlToToml('value: null')).toEqual({
      ok: false,
      error: 'JSON 包含 TOML 不支持的 null',
    });
  });

  it('YAML 格式化保留注释', () => {
    expect(formatYaml('# config\na:   1')).toEqual({ ok: true, value: '# config\na: 1' });
    expect(formatYaml('a: [')).toEqual({ ok: false, error: 'YAML 格式无效' });
  });

  it('Open Graph 标签转义 HTML 属性', () => {
    expect(generateOgTags({ title: 'A "title"', description: '<hello>', url: 'https://example.com' })).toContain(
      '<meta property="og:title" content="A &quot;title&quot;">',
    );
    expect(generateOgTags({ title: 'A', description: '<hello>', url: 'https://example.com' })).toContain(
      'content="&lt;hello&gt;"',
    );
  });

  it('SVG 占位图转义文本并约束尺寸', () => {
    expect(generateSvgPlaceholder(320, 180, '#123456', '<demo>')).toContain(
      '&lt;demo&gt;',
    );
    expect(() => generateSvgPlaceholder(0, 180, '#123456', 'x')).toThrow('尺寸');
    expect(() => generateSvgPlaceholder(10, 10, 'red" onload="alert(1)', 'x')).toThrow('颜色');
  });

  it('百分比计算处理 0 分母和小数', () => {
    expect(percentOf(12.5, 80)).toBe(10);
    expect(percentShare(20, 80)).toBe(25);
    expect(() => percentShare(1, 0)).toThrow('零');
  });
});

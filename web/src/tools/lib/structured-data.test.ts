import { describe, expect, it } from 'vitest';
import { jsonToToml, jsonToYaml, tomlToJson, yamlToJson } from './structured-data';

describe('YAML 与 JSON 转换', () => {
  it('把包含数组和中文的 YAML 转成格式化 JSON', () => {
    expect(yamlToJson('name: 虾米\ntags:\n  - 工具\n  - 前端')).toEqual({
      ok: true,
      value: '{\n  "name": "虾米",\n  "tags": [\n    "工具",\n    "前端"\n  ]\n}',
    });
  });

  it('把 JSON 转成 YAML', () => {
    const result = jsonToYaml('{"name":"Shrimp","ready":true}');
    expect(result.ok && result.value).toContain('name: Shrimp');
    expect(result.ok && result.value).toContain('ready: true');
  });

  it('为无效 YAML 和 JSON 返回中文错误', () => {
    expect(yamlToJson('name: [')).toEqual({ ok: false, error: 'YAML 格式无效' });
    expect(jsonToYaml('{')).toEqual({ ok: false, error: 'JSON 格式无效' });
  });

  it('拒绝会丢失精度的 YAML 整数', () => {
    expect(yamlToJson('id: 9007199254740993')).toEqual({
      ok: false,
      error: 'YAML 中的整数超出 JSON 安全范围',
    });
  });

  it('拒绝 JSON 转 YAML 时会丢失精度的整数', () => {
    expect(jsonToYaml('{"id":9007199254740993}')).toEqual({
      ok: false,
      error: 'JSON 中的整数超出 YAML 安全范围',
    });
  });
});

describe('JSON 与 TOML 转换', () => {
  it('在 JSON 和 TOML 间保留嵌套对象与数组', () => {
    const toml = jsonToToml('{"server":{"port":8080},"tags":["a","b"]}');
    expect(toml.ok && toml.value).toContain('[server]');
    expect(toml.ok && toml.value).toContain('port = 8080');
    expect(tomlToJson(toml.ok ? toml.value : '')).toEqual({
      ok: true,
      value: '{\n  "tags": [\n    "a",\n    "b"\n  ],\n  "server": {\n    "port": 8080\n  }\n}',
    });
  });

  it('为不支持的 JSON 根值和无效 TOML 返回中文错误', () => {
    expect(jsonToToml('[1,2]')).toEqual({
      ok: false,
      error: 'TOML 根节点必须是 JSON 对象',
    });
    expect(tomlToJson('name = ')).toEqual({ ok: false, error: 'TOML 格式无效' });
  });

  it('拒绝 TOML 会静默丢弃的 null 和不安全整数', () => {
    expect(jsonToToml('{"nested":{"value":null},"items":[1,null]}')).toEqual({
      ok: false,
      error: 'JSON 包含 TOML 不支持的 null',
    });
    expect(jsonToToml('{"id":9007199254740993}')).toEqual({
      ok: false,
      error: 'JSON 中的整数超出 TOML 安全范围',
    });
    expect(tomlToJson('id = 9007199254740993')).toEqual({
      ok: false,
      error: 'TOML 中的整数超出 JSON 安全范围',
    });
  });
});

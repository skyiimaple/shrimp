import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { failure, type Result } from './result';

function parseJsonObject(input: string): Result<Record<string, unknown>> {
  try {
    const value: unknown = JSON.parse(input);
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      return failure('TOML 根节点必须是 JSON 对象');
    }
    return { ok: true, value: value as Record<string, unknown> };
  } catch {
    return failure('JSON 格式无效');
  }
}

function normalizeForJson(value: unknown, source: 'YAML' | 'TOML'): Result<unknown> {
  if (typeof value === 'bigint') {
    if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
      return failure(`${source} 中的整数超出 JSON 安全范围`);
    }
    return { ok: true, value: Number(value) };
  }
  if (typeof value === 'number' && Number.isInteger(value) && !Number.isSafeInteger(value)) {
    return failure(`${source} 中的整数超出 JSON 安全范围`);
  }
  if (Array.isArray(value)) {
    const output: unknown[] = [];
    for (const item of value) {
      const normalized = normalizeForJson(item, source);
      if (!normalized.ok) return normalized;
      output.push(normalized.value);
    }
    return { ok: true, value: output };
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      const normalized = normalizeForJson(item, source);
      if (!normalized.ok) return normalized;
      output[key] = normalized.value;
    }
    return { ok: true, value: output };
  }
  return { ok: true, value };
}

function validateForToml(value: unknown): Result<unknown> {
  if (value === null) return failure('JSON 包含 TOML 不支持的 null');
  if (typeof value === 'number' && Number.isInteger(value) && !Number.isSafeInteger(value)) {
    return failure('JSON 中的整数超出 TOML 安全范围');
  }
  const items = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? Object.values(value)
      : [];
  for (const item of items) {
    const result = validateForToml(item);
    if (!result.ok) return result;
  }
  return { ok: true, value };
}

function validateForYaml(value: unknown): Result<unknown> {
  if (typeof value === 'number' && Number.isInteger(value) && !Number.isSafeInteger(value)) {
    return failure('JSON 中的整数超出 YAML 安全范围');
  }
  const items = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? Object.values(value)
      : [];
  for (const item of items) {
    const result = validateForYaml(item);
    if (!result.ok) return result;
  }
  return { ok: true, value };
}

export function yamlToJson(input: string): Result<string> {
  try {
    const normalized = normalizeForJson(parseYaml(input, { intAsBigInt: true }), 'YAML');
    if (!normalized.ok) return normalized;
    return { ok: true, value: JSON.stringify(normalized.value, null, 2) };
  } catch {
    return failure('YAML 格式无效');
  }
}

export function jsonToYaml(input: string): Result<string> {
  try {
    const value: unknown = JSON.parse(input);
    const validation = validateForYaml(value);
    if (!validation.ok) return validation;
    return { ok: true, value: stringifyYaml(value).trimEnd() };
  } catch {
    return failure('JSON 格式无效');
  }
}

export function tomlToJson(input: string): Result<string> {
  try {
    const normalized = normalizeForJson(
      parseToml(input, { integersAsBigInt: 'asNeeded', unsafeKeyBehaviour: 'throw' }),
      'TOML',
    );
    if (!normalized.ok) return normalized;
    return { ok: true, value: JSON.stringify(normalized.value, null, 2) };
  } catch {
    return failure('TOML 格式无效');
  }
}

export function jsonToToml(input: string): Result<string> {
  const parsed = parseJsonObject(input);
  if (!parsed.ok) return parsed;
  const validation = validateForToml(parsed.value);
  if (!validation.ok) return validation;
  try {
    return { ok: true, value: stringifyToml(parsed.value).trimEnd() };
  } catch {
    return failure('JSON 包含 TOML 不支持的数据');
  }
}

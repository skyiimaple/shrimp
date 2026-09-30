import { failure, type Result } from './result';

export type Radix = 2 | 8 | 10 | 16;
export type QueryParameter = { key: string; value: string };

export const encodeUrlComponent = (input: string) => encodeURIComponent(input);

export function decodeUrlComponent(input: string): Result<string> {
  try {
    return { ok: true, value: decodeURIComponent(input) };
  } catch {
    return failure('URL 编码无效');
  }
}

export function parseQueryParameters(input: string): Result<QueryParameter[]> {
  const trimmed = input.trim();
  let query: string;
  try {
    query =
      /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) || trimmed.startsWith('/')
        ? new URL(trimmed, 'https://shrimp.local').search.slice(1)
        : trimmed.replace(/^\?/, '').split('#', 1)[0];
  } catch {
    return failure('URL 格式无效');
  }
  if (!query) return { ok: true, value: [] };
  try {
    return {
      ok: true,
      value: query
        .split('&')
        .filter(Boolean)
        .map((part) => {
          const separator = part.indexOf('=');
          const rawKey = separator < 0 ? part : part.slice(0, separator);
          const rawValue = separator < 0 ? '' : part.slice(separator + 1);
          return {
            key: decodeURIComponent(rawKey.replace(/\+/g, ' ')),
            value: decodeURIComponent(rawValue.replace(/\+/g, ' ')),
          };
        }),
    };
  } catch {
    return failure('查询参数编码无效');
  }
}

const radixNames: Record<Radix, string> = { 2: '二', 8: '八', 10: '十', 16: '十六' };
const digitValue = (character: string) => {
  const code = character.toUpperCase().charCodeAt(0);
  return code >= 48 && code <= 57 ? code - 48 : code >= 65 && code <= 70 ? code - 55 : -1;
};

export function convertRadix(input: string, from: Radix, to: Radix): Result<string> {
  let normalized = input.trim();
  if (!normalized) return failure('请输入要转换的整数');
  const negative = normalized.startsWith('-');
  if (normalized[0] === '-' || normalized[0] === '+') normalized = normalized.slice(1);
  const prefix = from === 2 ? /^0b/i : from === 8 ? /^0o/i : from === 16 ? /^0x/i : /$^/;
  normalized = normalized.replace(prefix, '');
  if (
    !normalized ||
    [...normalized].some((character) => digitValue(character) < 0 || digitValue(character) >= from)
  ) {
    return failure(`输入不是有效的${radixNames[from]}进制整数`);
  }
  let value = 0n;
  for (const character of normalized) value = value * BigInt(from) + BigInt(digitValue(character));
  if (negative) value = -value;
  return { ok: true, value: value.toString(to).toUpperCase() };
}

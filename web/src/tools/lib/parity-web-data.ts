import { parseDocument } from 'yaml';
import { encodeHtmlEntities } from './parity-basics';
import { jsonToToml, jsonToYaml, tomlToJson, yamlToJson } from './structured-data';
import { failure, type Result } from './result';

export function yamlToToml(input: string): Result<string> {
  const json = yamlToJson(input);
  return json.ok ? jsonToToml(json.value) : json;
}

export function tomlToYaml(input: string): Result<string> {
  const json = tomlToJson(input);
  return json.ok ? jsonToYaml(json.value) : json;
}

export function formatYaml(input: string): Result<string> {
  try {
    const document = parseDocument(input, { intAsBigInt: true, uniqueKeys: true });
    if (document.errors.length) return failure('YAML 格式无效');
    return { ok: true, value: document.toString({ indent: 2, lineWidth: 0 }).trimEnd() };
  } catch {
    return failure('YAML 格式无效');
  }
}

export function generateOgTags(input: {
  title: string;
  description: string;
  url: string;
  image?: string;
}) {
  const entries = [
    ['og:title', input.title],
    ['og:description', input.description],
    ['og:url', input.url],
    ['og:image', input.image ?? ''],
  ];
  return entries
    .filter(([, value]) => value.trim())
    .map(
      ([property, value]) => `<meta property="${property}" content="${encodeHtmlEntities(value)}">`,
    )
    .join('\n');
}

export function generateSvgPlaceholder(
  width: number,
  height: number,
  color: string,
  label: string,
) {
  if (![width, height].every((value) => Number.isInteger(value) && value >= 1 && value <= 4096)) {
    throw new Error('尺寸须为 1 到 4096 的整数');
  }
  if (!/^#[\da-fA-F]{6}$/.test(color)) throw new Error('颜色须为六位 HEX 格式');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#fff" font-family="sans-serif" font-size="20">${encodeHtmlEntities(label)}</text></svg>`;
}

function validNumber(value: number) {
  if (!Number.isFinite(value)) throw new Error('请输入有效数字');
}

export function percentOf(percent: number, total: number) {
  validNumber(percent);
  validNumber(total);
  return (percent / 100) * total;
}

export function percentShare(part: number, total: number) {
  validNumber(part);
  validNumber(total);
  if (total === 0) throw new Error('总数不能为零');
  return (part / total) * 100;
}

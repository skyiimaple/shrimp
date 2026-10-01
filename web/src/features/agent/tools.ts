import { decodeBase64Utf8, encodeBase64Utf8 } from '../../tools/lib/base64';
import { formatJson, minifyJson } from '../../tools/lib/json';
import { parseTimestamp } from '../../tools/lib/timestamp';
import { generateUuidBatch } from '../../tools/lib/uuid';
import { runRegexInWorker } from './regex-runner';

interface ToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

const schema = (
  name: string,
  description: string,
  properties: Record<string, unknown>,
  required: string[],
): ToolSchema => ({
  type: 'function',
  function: {
    name,
    description,
    parameters: { type: 'object', properties, required, additionalProperties: false },
  },
});

export const agentToolSchemas: ToolSchema[] = [
  schema(
    'json_transform',
    '格式化或压缩 JSON 文本',
    { mode: { type: 'string', enum: ['format', 'minify'] }, input: { type: 'string' } },
    ['mode', 'input'],
  ),
  schema(
    'base64_transform',
    '对 UTF-8 文本进行 Base64 编码或解码',
    { mode: { type: 'string', enum: ['encode', 'decode'] }, input: { type: 'string' } },
    ['mode', 'input'],
  ),
  schema(
    'timestamp_convert',
    '将 Unix 时间戳转换为日期',
    { input: { type: 'string' }, unit: { type: 'string', enum: ['seconds', 'milliseconds'] } },
    ['input', 'unit'],
  ),
  schema(
    'uuid_generate',
    '生成 1 到 20 个 UUID v4',
    { count: { type: 'integer', minimum: 1, maximum: 20 } },
    ['count'],
  ),
  schema(
    'regex_match',
    '用正则表达式匹配文本，返回至多 100 个结果',
    { pattern: { type: 'string' }, flags: { type: 'string' }, text: { type: 'string' } },
    ['pattern', 'flags', 'text'],
  ),
];

const invalid = (content: string) => ({ ok: false, content });
const success = (content: string) => ({ ok: true, content: content.slice(0, 12000) });
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const shortString = (value: unknown, limit = 4000): value is string =>
  typeof value === 'string' && value.length <= limit;

export async function executeAgentTool(
  name: string,
  args: unknown,
  signal?: AbortSignal,
): Promise<{ ok: boolean; content: string }> {
  if (signal?.aborted) return invalid('操作已取消');
  if (!isRecord(args)) return invalid('工具参数必须是对象');
  try {
    switch (name) {
      case 'json_transform': {
        if (!shortString(args.input) || (args.mode !== 'format' && args.mode !== 'minify'))
          return invalid('JSON 参数无效或过长');
        const result = args.mode === 'format' ? formatJson(args.input) : minifyJson(args.input);
        return result.ok ? success(result.value) : invalid(result.error);
      }
      case 'base64_transform': {
        if (!shortString(args.input) || (args.mode !== 'encode' && args.mode !== 'decode'))
          return invalid('Base64 参数无效或过长');
        if (args.mode === 'encode') return success(encodeBase64Utf8(args.input));
        const result = decodeBase64Utf8(args.input);
        return result.ok ? success(result.value) : invalid(result.error);
      }
      case 'timestamp_convert': {
        if (
          !shortString(args.input, 64) ||
          (args.unit !== 'seconds' && args.unit !== 'milliseconds')
        )
          return invalid('时间戳参数无效');
        const result = parseTimestamp(args.input, args.unit);
        return result.ok ? success(JSON.stringify(result.value)) : invalid(result.error);
      }
      case 'uuid_generate': {
        if (!Number.isInteger(args.count) || Number(args.count) < 1 || Number(args.count) > 20)
          return invalid('生成数量必须在 1 到 20 之间');
        const result = generateUuidBatch(args.count as number);
        return result.ok ? success(JSON.stringify(result.value)) : invalid(result.error);
      }
      case 'regex_match': {
        if (
          !shortString(args.pattern, 200) ||
          !shortString(args.flags, 8) ||
          !shortString(args.text)
        )
          return invalid('正则参数无效或过长');
        const result = await runRegexInWorker(args.pattern, args.flags, args.text, signal);
        return result.ok ? success(JSON.stringify(result.value)) : invalid(result.error);
      }
      default:
        return invalid('未授权的工具');
    }
  } catch {
    return invalid('工具执行失败');
  }
}

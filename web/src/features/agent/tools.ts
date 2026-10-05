import { decodeBase64Utf8, encodeBase64Utf8 } from '../../tools/lib/base64';
import {
  convertRadix,
  decodeUrlComponent,
  encodeUrlComponent,
  parseQueryParameters,
} from '../../tools/lib/encoding';
import { formatJson, minifyJson } from '../../tools/lib/json';
import { diffJson } from '../../tools/lib/json-diff';
import { decodeJwt } from '../../tools/lib/jwt';
import { convertColor } from '../../tools/lib/color';
import { hashText, type HashAlgorithm } from '../../tools/lib/hash';
import { delimitedToJson, jsonToDelimited } from '../../tools/lib/delimited';
import { jsonToToml, jsonToYaml, tomlToJson, yamlToJson } from '../../tools/lib/structured-data';
import { formatYaml } from '../../tools/lib/parity-web-data';
import {
  calculateIpv4Subnet,
  convertIpv4Address,
  generateMacAddress,
} from '../../tools/lib/parity-network';
import { findHttpStatuses, findMimeTypes } from '../../tools/lib/parity-web-reference';
import { encodeHtmlEntities, decodeHtmlEntities, textStats } from '../../tools/lib/parity-basics';
import { integerToRoman, numeronym, romanToInteger } from '../../tools/lib/parity-basics';
import {
  binaryToText,
  textToBinary,
  textToUnicode,
  unicodeToText,
  convertTemperature,
  type TemperatureScale,
} from '../../tools/lib/parity-converters';
import { slugify } from '../../tools/lib/parity-converters';
import { parseTimestamp } from '../../tools/lib/timestamp';
import { convertTextCase, type TextCaseMode } from '../../tools/lib/text-processing';
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
  schema(
    'url_transform',
    '编码或解码 URL 组件，不发起网络请求',
    { mode: { type: 'string', enum: ['encode', 'decode'] }, input: { type: 'string' } },
    ['mode', 'input'],
  ),
  schema(
    'html_entities',
    '编码或解码 HTML 实体',
    { mode: { type: 'string', enum: ['encode', 'decode'] }, input: { type: 'string' } },
    ['mode', 'input'],
  ),
  schema(
    'text_stats',
    '统计文本的字符、单词、行数和 UTF-8 字节数',
    {
      input: { type: 'string' },
    },
    ['input'],
  ),
  schema(
    'text_case',
    '转换文本命名和大小写格式',
    {
      mode: {
        type: 'string',
        enum: ['camel', 'pascal', 'snake', 'kebab', 'title', 'upper', 'lower'],
      },
      input: { type: 'string' },
    },
    ['mode', 'input'],
  ),
  schema('slugify', '将文本转换为 URL 友好的短横线 slug', { input: { type: 'string' } }, ['input']),
  schema('jwt_decode', '只解码 JWT Header 和 Payload，不验证签名', { input: { type: 'string' } }, [
    'input',
  ]),
  schema('color_convert', '在 HEX、RGB 和 HSL 之间转换颜色', { input: { type: 'string' } }, [
    'input',
  ]),
  schema(
    'radix_convert',
    '在二、八、十和十六进制之间转换整数',
    {
      input: { type: 'string' },
      from: { type: 'integer', enum: [2, 8, 10, 16] },
      to: { type: 'integer', enum: [2, 8, 10, 16] },
    },
    ['input', 'from', 'to'],
  ),
  schema(
    'query_transform',
    '解析 URL 查询参数，或根据键值对构造查询字符串',
    {
      mode: { type: 'string', enum: ['parse', 'build'] },
      input: { type: 'string' },
      entries: {
        type: 'array',
        items: {
          type: 'object',
          properties: { key: { type: 'string' }, value: { type: 'string' } },
          required: ['key', 'value'],
          additionalProperties: false,
        },
      },
    },
    ['mode'],
  ),
  schema(
    'hash_text',
    '使用浏览器 Web Crypto 对文本计算 SHA 摘要，不访问网络或文件',
    {
      input: { type: 'string' },
      algorithm: { type: 'string', enum: ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] },
    },
    ['input', 'algorithm'],
  ),
  schema(
    'json_diff',
    '比较两份 JSON 并返回变更和 JSON Patch',
    { left: { type: 'string' }, right: { type: 'string' } },
    ['left', 'right'],
  ),
  schema(
    'csv_json_transform',
    '在 CSV/TSV 文本和 JSON 对象数组之间转换',
    {
      mode: { type: 'string', enum: ['to_json', 'from_json'] },
      format: { type: 'string', enum: ['csv', 'tsv'] },
      input: { type: 'string' },
    },
    ['mode', 'format', 'input'],
  ),
  schema(
    'structured_data_transform',
    '在 YAML、JSON 和 TOML 之间转换结构化数据',
    {
      mode: {
        type: 'string',
        enum: ['yaml_to_json', 'json_to_yaml', 'toml_to_json', 'json_to_toml'],
      },
      input: { type: 'string' },
    },
    ['mode', 'input'],
  ),
  schema('yaml_format', '格式化并校验 YAML，不执行其中内容', { input: { type: 'string' } }, [
    'input',
  ]),
  schema(
    'roman_numeral',
    '在 1 到 3999 的整数和规范罗马数字之间转换',
    { mode: { type: 'string', enum: ['to_roman', 'from_roman'] }, input: { type: 'string' } },
    ['mode', 'input'],
  ),
  schema('numeronym', '将长词转换为 i18n 一类的数字缩写', { input: { type: 'string' } }, ['input']),
  schema(
    'binary_text_transform',
    '在 UTF-8 文本和八位二进制字节之间转换',
    { mode: { type: 'string', enum: ['to_binary', 'from_binary'] }, input: { type: 'string' } },
    ['mode', 'input'],
  ),
  schema(
    'unicode_text_transform',
    '在文本和 U+XXXX Unicode 码点序列之间转换',
    { mode: { type: 'string', enum: ['to_unicode', 'from_unicode'] }, input: { type: 'string' } },
    ['mode', 'input'],
  ),
  schema(
    'temperature_convert',
    '在摄氏、华氏和开尔文之间转换温度',
    {
      value: { type: 'number' },
      from: { type: 'string', enum: ['C', 'F', 'K'] },
      to: { type: 'string', enum: ['C', 'F', 'K'] },
    },
    ['value', 'from', 'to'],
  ),
  schema('ipv4_subnet', '计算 IPv4 CIDR 的网络、广播和主机范围', { input: { type: 'string' } }, [
    'input',
  ]),
  schema('ipv4_address', '在 IPv4 点分地址与整数表示之间转换', { input: { type: 'string' } }, [
    'input',
  ]),
  schema('mac_address_generate', '生成本地管理的随机单播 MAC 地址', {}, []),
  schema('mime_lookup', '查询本地内置的常见 MIME 类型，不访问网络', { query: { type: 'string' } }, [
    'query',
  ]),
  schema(
    'http_status_lookup',
    '查询本地内置的常见 HTTP 状态码，不发起请求',
    { query: { type: 'string' } },
    ['query'],
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
      case 'url_transform': {
        if (!shortString(args.input) || (args.mode !== 'encode' && args.mode !== 'decode'))
          return invalid('URL 参数无效或过长');
        if (args.mode === 'encode') return success(encodeUrlComponent(args.input));
        const result = decodeUrlComponent(args.input);
        return result.ok ? success(result.value) : invalid(result.error);
      }
      case 'html_entities': {
        if (!shortString(args.input) || (args.mode !== 'encode' && args.mode !== 'decode'))
          return invalid('HTML 实体参数无效或过长');
        return success(
          args.mode === 'encode' ? encodeHtmlEntities(args.input) : decodeHtmlEntities(args.input),
        );
      }
      case 'text_stats': {
        if (!shortString(args.input)) return invalid('文本参数无效或过长');
        return success(JSON.stringify(textStats(args.input)));
      }
      case 'text_case': {
        const modes = ['camel', 'pascal', 'snake', 'kebab', 'title', 'upper', 'lower'];
        if (!shortString(args.input) || typeof args.mode !== 'string' || !modes.includes(args.mode))
          return invalid('大小写参数无效或过长');
        return success(convertTextCase(args.input, args.mode as TextCaseMode));
      }
      case 'slugify': {
        if (!shortString(args.input)) return invalid('Slug 参数无效或过长');
        return success(slugify(args.input));
      }
      case 'jwt_decode': {
        if (!shortString(args.input)) return invalid('JWT 参数无效或过长');
        const result = decodeJwt(args.input);
        return result.ok ? success(JSON.stringify(result.value)) : invalid(result.error);
      }
      case 'color_convert': {
        if (!shortString(args.input, 200)) return invalid('颜色参数无效或过长');
        const result = convertColor(args.input);
        return result.ok ? success(JSON.stringify(result.value)) : invalid(result.error);
      }
      case 'radix_convert': {
        const bases = [2, 8, 10, 16];
        if (
          !shortString(args.input, 200) ||
          !bases.includes(args.from as number) ||
          !bases.includes(args.to as number)
        )
          return invalid('进制参数无效或过长');
        const result = convertRadix(
          args.input,
          args.from as 2 | 8 | 10 | 16,
          args.to as 2 | 8 | 10 | 16,
        );
        return result.ok ? success(result.value) : invalid(result.error);
      }
      case 'query_transform': {
        if (args.mode !== 'parse' && args.mode !== 'build') return invalid('查询参数模式无效');
        if (args.mode === 'parse') {
          if (!shortString(args.input)) return invalid('查询参数无效或过长');
          const result = parseQueryParameters(args.input);
          return result.ok ? success(JSON.stringify(result.value)) : invalid(result.error);
        }
        if (!Array.isArray(args.entries) || args.entries.length > 100)
          return invalid('查询参数键值对无效');
        if (
          !args.entries.every(
            (entry) =>
              isRecord(entry) && shortString(entry.key, 400) && shortString(entry.value, 400),
          )
        )
          return invalid('查询参数键值对无效');
        return success(
          args.entries
            .map((entry) => `${encodeURIComponent(entry.key)}=${encodeURIComponent(entry.value)}`)
            .join('&'),
        );
      }
      case 'hash_text': {
        const algorithms = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
        if (
          !shortString(args.input) ||
          typeof args.algorithm !== 'string' ||
          !algorithms.includes(args.algorithm)
        )
          return invalid('哈希参数无效或过长');
        return success(await hashText(args.input, args.algorithm as HashAlgorithm));
      }
      case 'json_diff': {
        if (!shortString(args.left) || !shortString(args.right))
          return invalid('JSON 参数无效或过长');
        const result = diffJson(args.left, args.right);
        return result.ok ? success(JSON.stringify(result.value)) : invalid(result.error);
      }
      case 'csv_json_transform': {
        if (!shortString(args.input) || (args.mode !== 'to_json' && args.mode !== 'from_json'))
          return invalid('CSV/TSV 参数无效或过长');
        if (args.format !== 'csv' && args.format !== 'tsv') return invalid('CSV/TSV 格式无效');
        const delimiter = args.format === 'csv' ? ',' : '\t';
        const result =
          args.mode === 'to_json'
            ? delimitedToJson(args.input, delimiter)
            : jsonToDelimited(args.input, delimiter);
        return result.ok ? success(result.value) : invalid(result.error);
      }
      case 'structured_data_transform': {
        if (!shortString(args.input)) return invalid('结构化数据参数无效或过长');
        const converters = {
          yaml_to_json: yamlToJson,
          json_to_yaml: jsonToYaml,
          toml_to_json: tomlToJson,
          json_to_toml: jsonToToml,
        } as const;
        if (typeof args.mode !== 'string' || !(args.mode in converters))
          return invalid('结构化数据转换模式无效');
        const result = converters[args.mode as keyof typeof converters](args.input);
        return result.ok ? success(result.value) : invalid(result.error);
      }
      case 'yaml_format': {
        if (!shortString(args.input)) return invalid('YAML 参数无效或过长');
        const result = formatYaml(args.input);
        return result.ok ? success(result.value) : invalid(result.error);
      }
      case 'roman_numeral': {
        if (
          !shortString(args.input, 32) ||
          (args.mode !== 'to_roman' && args.mode !== 'from_roman')
        )
          return invalid('罗马数字参数无效或过长');
        try {
          return success(
            args.mode === 'to_roman'
              ? integerToRoman(Number(args.input))
              : String(romanToInteger(args.input)),
          );
        } catch (error) {
          return invalid(error instanceof Error ? error.message : '罗马数字无效');
        }
      }
      case 'numeronym': {
        if (!shortString(args.input)) return invalid('数字缩写参数无效或过长');
        return success(numeronym(args.input));
      }
      case 'binary_text_transform': {
        if (!shortString(args.input) || (args.mode !== 'to_binary' && args.mode !== 'from_binary'))
          return invalid('二进制文本参数无效或过长');
        try {
          return success(
            args.mode === 'to_binary' ? textToBinary(args.input) : binaryToText(args.input),
          );
        } catch (error) {
          return invalid(error instanceof Error ? error.message : '二进制文本无效');
        }
      }
      case 'unicode_text_transform': {
        if (
          !shortString(args.input) ||
          (args.mode !== 'to_unicode' && args.mode !== 'from_unicode')
        )
          return invalid('Unicode 参数无效或过长');
        try {
          return success(
            args.mode === 'to_unicode' ? textToUnicode(args.input) : unicodeToText(args.input),
          );
        } catch (error) {
          return invalid(error instanceof Error ? error.message : 'Unicode 参数无效');
        }
      }
      case 'temperature_convert': {
        const scales = ['C', 'F', 'K'];
        if (
          typeof args.value !== 'number' ||
          !Number.isFinite(args.value) ||
          typeof args.from !== 'string' ||
          !scales.includes(args.from) ||
          typeof args.to !== 'string' ||
          !scales.includes(args.to)
        )
          return invalid('温度参数无效');
        try {
          return success(
            String(
              convertTemperature(
                args.value,
                args.from as TemperatureScale,
                args.to as TemperatureScale,
              ),
            ),
          );
        } catch (error) {
          return invalid(error instanceof Error ? error.message : '温度参数无效');
        }
      }
      case 'ipv4_subnet': {
        if (!shortString(args.input, 64)) return invalid('IPv4 CIDR 参数无效或过长');
        try {
          return success(JSON.stringify(calculateIpv4Subnet(args.input)));
        } catch (error) {
          return invalid(error instanceof Error ? error.message : 'IPv4 CIDR 无效');
        }
      }
      case 'ipv4_address': {
        if (!shortString(args.input, 64)) return invalid('IPv4 参数无效或过长');
        try {
          return success(JSON.stringify(convertIpv4Address(args.input)));
        } catch (error) {
          return invalid(error instanceof Error ? error.message : 'IPv4 地址无效');
        }
      }
      case 'mac_address_generate':
        return success(generateMacAddress());
      case 'mime_lookup': {
        if (!shortString(args.query, 200)) return invalid('MIME 查询参数无效或过长');
        return success(JSON.stringify(findMimeTypes(args.query)));
      }
      case 'http_status_lookup': {
        if (!shortString(args.query, 100)) return invalid('HTTP 状态码查询参数无效或过长');
        return success(JSON.stringify(findHttpStatuses(args.query)));
      }
      default:
        return invalid('未授权的工具');
    }
  } catch {
    return invalid('工具执行失败');
  }
}

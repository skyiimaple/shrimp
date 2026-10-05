import { sendHttpRequest } from '../http/client';
import type { HttpMethod } from '../http/types';
import { queryNetwork } from '../network/client';
import { analyzeCron } from '../../tools/lib/cron';
import { markdownToHtml } from '../../tools/lib/markdown';
import { generatePassword, analyzePassword } from '../../tools/lib/password';
import { formatSql } from '../../tools/lib/sql';
import { processList, type ListSort } from '../../tools/lib/text-processing';
import { parseUserAgent } from '../../tools/lib/user-agent';
import { generateWeeklyReport, parseWeeklyRows, productMap } from '../../tools/lib/weekly-report';
import { basicAuthHeader, chmodInfo, diffTextLines, hmacHex } from '../../tools/lib/parity-basics';
import { generateUlid, randomPort } from '../../tools/lib/parity-converters';
import {
  decryptText,
  encryptText,
  generateRsaKeyPair,
  generateTotpSecret,
  totp,
} from '../../tools/lib/parity-crypto';
import {
  deriveMnemonicSeed,
  generateBcryptHash,
  generateMnemonicPhrase,
  validateMnemonicPhrase,
  verifyBcryptHash,
} from '../../tools/lib/parity-crypto-advanced';
import { dockerRunToCompose } from '../../tools/lib/parity-docker-compose';
import { inspectIban } from '../../tools/lib/parity-iban';
import { lookupMacVendor } from '../../tools/lib/parity-mac-vendor';
import { calculateEtaSeconds, evaluateMathExpression } from '../../tools/lib/parity-math';
import { expandIpv4Range, generateIpv6Ula } from '../../tools/lib/parity-network-extra';
import { inspectPhoneNumber } from '../../tools/lib/parity-phone';
import { buildWifiPayload, generateQrSvg } from '../../tools/lib/parity-qr';
import {
  decodeOutlookSafeLink,
  findCommonEmojis,
  findGitCommands,
  fromNatoAlphabet,
  toNatoAlphabet,
} from '../../tools/lib/parity-reference-more';
import {
  analyzePasswordStrength,
  drawAsciiText,
  generateToken,
} from '../../tools/lib/parity-small-gaps';
import {
  maskText,
  normalizeEmail,
  generateLoremIpsum,
  searchRegexCheatsheet,
} from '../../tools/lib/parity-text-misc';
import {
  generateOgTags,
  generateSvgPlaceholder,
  percentOf,
  percentShare,
  tomlToYaml,
  yamlToToml,
} from '../../tools/lib/parity-web-data';
import { formatXml, jsonToXml, xmlToJson } from '../../tools/lib/parity-xml';

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

const text = { type: 'string' };
const mode = (values: string[]) => ({ type: 'string', enum: values });

export const toolboxSchemas: ToolSchema[] = [
  schema('cron_analyze', '解析标准五段 Cron，并给出接下来最多 5 次运行时间', { expression: text }, [
    'expression',
  ]),
  schema(
    'weekly_report',
    `把制表符分隔的周报表格整理成团队与个人周报。产品键：${Object.keys(productMap).join('、')}`,
    {
      input: text,
      products: { type: 'array', items: { type: 'string' } },
      members: { type: 'array', items: { type: 'string' } },
    },
    ['input', 'products', 'members'],
  ),
  schema('markdown_to_html', '把 Markdown 转成经过净化的 HTML，不执行脚本', { input: text }, [
    'input',
  ]),
  schema('sql_format', '格式化 SQL，不连接数据库', { input: text }, ['input']),
  schema(
    'password_generate',
    '用安全随机源生成 4 到 128 位密码',
    {
      length: { type: 'integer', minimum: 4, maximum: 128 },
      lower: { type: 'boolean' },
      upper: { type: 'boolean' },
      digits: { type: 'boolean' },
      symbols: { type: 'boolean' },
    },
    ['length'],
  ),
  schema('password_analyze', '估算已有密码的强度，不保存密码', { input: text }, ['input']),
  schema(
    'list_process',
    '按行去重和排序文本列表',
    {
      input: text,
      deduplicate: { type: 'boolean' },
      sort: mode(['none', 'asc', 'desc']),
    },
    ['input'],
  ),
  schema('user_agent_parse', '解析 User-Agent 字符串，不访问网络', { input: text }, ['input']),
  schema('text_diff', '按行比较两段文本', { before: text, after: text }, ['before', 'after']),
  schema(
    'hmac_hex',
    '用密钥计算文本的 HMAC 十六进制摘要',
    { key: text, message: text, algorithm: mode(['SHA-256', 'SHA-384', 'SHA-512']) },
    ['key', 'message', 'algorithm'],
  ),
  schema(
    'basic_auth_header',
    '生成 HTTP Basic Authorization 头',
    { username: text, password: text },
    ['username', 'password'],
  ),
  schema('chmod_info', '把三位八进制权限转换成符号权限', { input: text }, ['input']),
  schema('ulid_generate', '生成一个 ULID', {}, []),
  schema('random_port', '生成一个 1024 到 65535 的随机端口', {}, []),
  schema(
    'yaml_toml_transform',
    '在 YAML 和 TOML 之间转换',
    { mode: mode(['yaml_to_toml', 'toml_to_yaml']), input: text },
    ['mode', 'input'],
  ),
  schema(
    'og_meta',
    '根据标题、描述和地址生成 Open Graph meta 标签',
    { title: text, description: text, url: text, image: text },
    ['title', 'description', 'url'],
  ),
  schema(
    'svg_placeholder',
    '生成指定尺寸的 SVG 占位图',
    {
      width: { type: 'integer', minimum: 1, maximum: 4096 },
      height: { type: 'integer', minimum: 1, maximum: 4096 },
      color: text,
      label: text,
    },
    ['width', 'height', 'color', 'label'],
  ),
  schema(
    'percentage',
    '计算百分比数值，或计算一部分占总数的百分比',
    {
      mode: mode(['of', 'share']),
      percent: { type: 'number' },
      part: { type: 'number' },
      total: { type: 'number' },
    },
    ['mode', 'total'],
  ),
  schema(
    'text_cipher',
    '用口令在浏览器内加密或解密文本，密文带 shrimp:aes-gcm:v1 前缀',
    { mode: mode(['encrypt', 'decrypt']), input: text, password: text },
    ['mode', 'input', 'password'],
  ),
  schema(
    'totp',
    '生成 TOTP 密钥，或根据 Base32 密钥计算当前验证码',
    {
      mode: mode(['secret', 'code']),
      secret: text,
      digits: { type: 'integer', minimum: 6, maximum: 8 },
    },
    ['mode'],
  ),
  schema('rsa_key_pair', '在浏览器内生成 2048 位 RSA-OAEP 密钥对，私钥只返回给当前对话', {}, []),
  schema(
    'xml_transform',
    '格式化 XML，或在 XML 和 JSON 之间转换。不执行外部实体',
    { mode: mode(['format', 'to_json', 'from_json']), input: text },
    ['mode', 'input'],
  ),
  schema(
    'lorem_ipsum',
    '生成 1 到 20 段 Lorem Ipsum',
    { paragraphs: { type: 'integer', minimum: 1, maximum: 20 } },
    ['paragraphs'],
  ),
  schema(
    'text_mask',
    '保留文本首尾若干字符，其余替换为星号',
    {
      input: text,
      keepStart: { type: 'integer', minimum: 0, maximum: 20 },
      keepEnd: { type: 'integer', minimum: 0, maximum: 20 },
    },
    ['input', 'keepStart', 'keepEnd'],
  ),
  schema('email_normalize', '标准化邮箱地址', { input: text }, ['input']),
  schema('regex_cheatsheet', '在本地正则速查表中搜索，不执行正则', { query: text }, ['query']),
  schema('ipv4_range', '把 IPv4 起止地址展开为 CIDR', { start: text, end: text }, ['start', 'end']),
  schema('ipv6_ula', '生成一个随机 IPv6 ULA /48 前缀', {}, []),
  schema('qr_code', '根据文本生成二维码 SVG', { content: text }, ['content']),
  schema(
    'wifi_qr',
    '生成 WiFi 二维码 SVG',
    {
      ssid: text,
      password: text,
      security: mode(['WPA', 'WEP', 'nopass']),
      hidden: { type: 'boolean' },
    },
    ['ssid', 'security'],
  ),
  schema('math_expression', '计算只含数字和四则运算的数学表达式', { input: text }, ['input']),
  schema(
    'eta_calculate',
    '按距离（千米）和速度（千米/小时）计算预计秒数',
    { distanceKm: { type: 'number' }, speedKmH: { type: 'number' } },
    ['distanceKm', 'speedKmH'],
  ),
  schema(
    'nato_alphabet',
    '在文本和 NATO 字母表之间转换',
    { mode: mode(['to', 'from']), input: text },
    ['mode', 'input'],
  ),
  schema('outlook_safe_link', '解码 Outlook Safe Links 包裹的原始地址', { input: text }, ['input']),
  schema('git_command_lookup', '在本地 Git 命令速查表中搜索', { query: text }, ['query']),
  schema('emoji_lookup', '在本地常用 Emoji 表中搜索', { query: text }, ['query']),
  schema('iban_inspect', '校验并格式化 IBAN', { input: text }, ['input']),
  schema(
    'bcrypt',
    '生成或校验 Bcrypt 哈希，成本限制为 4 到 12',
    {
      mode: mode(['hash', 'verify']),
      password: text,
      hash: text,
      cost: { type: 'integer', minimum: 4, maximum: 12 },
    },
    ['mode', 'password'],
  ),
  schema(
    'bip39',
    '生成、校验 BIP39 英文助记词，或派生种子的十六进制',
    {
      mode: mode(['generate', 'validate', 'seed']),
      phrase: text,
      passphrase: text,
      wordCount: { type: 'integer', enum: [12, 24] },
    },
    ['mode'],
  ),
  schema('docker_run_to_compose', '把 docker run 命令转换成 Compose YAML', { input: text }, [
    'input',
  ]),
  schema('phone_number', '按两位 ISO 地区代码解析电话号码', { input: text, region: text }, [
    'input',
    'region',
  ]),
  schema(
    'token_generate',
    '按长度和字符集生成随机令牌。未给字符集时使用大小写字母和数字',
    { length: { type: 'integer', minimum: 1, maximum: 256 }, alphabet: text },
    ['length'],
  ),
  schema('password_strength', '检查密码是否过短或包含常见片段', { password: text }, ['password']),
  schema('ascii_text', '把英文字母和数字画成 ASCII 艺术字', { input: text }, ['input']),
  schema('mac_vendor_lookup', '按 MAC 地址查询厂商。首次查询会读取本站分片数据', { input: text }, [
    'input',
  ]),
  schema(
    'ip_lookup',
    '查询公网 IP 的归属地、运营商和 ASN。空输入查询当前出口 IP',
    { input: text },
    [],
  ),
  schema(
    'dns_lookup',
    '查询域名的 DNS 记录',
    { name: text, type: mode(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'CAA']) },
    ['name'],
  ),
  schema('rdap_lookup', '通过 RDAP 查询域名注册信息', { domain: text }, ['domain']),
  schema(
    'http_headers',
    '对公网 HTTPS 地址发送 HEAD 并返回响应头，不发送 Cookie 或 Authorization',
    { url: text },
    ['url'],
  ),
  schema('github_lookup', '查询公开 GitHub 仓库的基本信息', { repository: text }, ['repository']),
  schema('npm_lookup', '查询 npm 包的版本、依赖和上周下载量', { name: text }, ['name']),
  schema(
    'http_request',
    '通过本机受约束代理发送 HTTP 请求。只接受 http/https，拒绝内网和云元数据地址',
    {
      url: text,
      method: mode(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
      headers: { type: 'object', additionalProperties: { type: 'string' } },
      body: text,
    },
    ['url', 'method'],
  ),
];

const invalid = (content: string) => ({ ok: false as const, content });
const success = (content: string) => ({ ok: true as const, content: content.slice(0, 12000) });
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const shortString = (value: unknown, limit = 4000): value is string =>
  typeof value === 'string' && value.length <= limit;
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const names = new Set(toolboxSchemas.map((item) => item.function.name));

function fromResult(result: { ok: true; value: string } | { ok: false; error: string }) {
  return result.ok ? success(result.value) : invalid(result.error);
}

function caught(error: unknown, fallback: string) {
  return invalid(error instanceof Error ? error.message : fallback);
}

function stringList(value: unknown, limit: number): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= limit &&
    value.every((item) => shortString(item, 80))
  );
}

async function fetchTool(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { signal });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      isRecord(data) && typeof data.message === 'string' ? data.message : '查询失败，请稍后重试';
    return invalid(message);
  }
  return success(JSON.stringify(data));
}

export async function executeToolboxTool(
  name: string,
  args: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{ ok: boolean; content: string } | null> {
  if (!names.has(name)) return null;
  try {
    switch (name) {
      case 'cron_analyze': {
        if (!shortString(args.expression, 200)) return invalid('Cron 表达式无效或过长');
        const result = analyzeCron(args.expression, new Date(), 5);
        return result.ok ? success(JSON.stringify(result.value)) : invalid(result.error);
      }
      case 'weekly_report': {
        if (
          !shortString(args.input) ||
          !stringList(args.products, 20) ||
          !stringList(args.members, 50)
        )
          return invalid('周报参数无效或过长');
        const rows = parseWeeklyRows(args.input);
        if (!rows.ok) return invalid(rows.error);
        return fromResult(generateWeeklyReport(rows.value, args.products, args.members));
      }
      case 'markdown_to_html':
        return shortString(args.input)
          ? fromResult(markdownToHtml(args.input))
          : invalid('Markdown 参数无效或过长');
      case 'sql_format':
        return shortString(args.input)
          ? fromResult(formatSql(args.input))
          : invalid('SQL 参数无效或过长');
      case 'password_generate': {
        const length = args.length;
        if (!Number.isInteger(length)) return invalid('密码长度无效');
        const flag = (key: string) => (args[key] === undefined ? true : args[key] === true);
        if (
          ['lower', 'upper', 'digits', 'symbols'].some(
            (key) => args[key] !== undefined && typeof args[key] !== 'boolean',
          )
        )
          return invalid('密码字符类别无效');
        return fromResult(
          generatePassword({
            length: length as number,
            lower: flag('lower'),
            upper: flag('upper'),
            digits: flag('digits'),
            symbols: flag('symbols'),
          }),
        );
      }
      case 'password_analyze':
        return shortString(args.input, 256)
          ? success(JSON.stringify(analyzePassword(args.input)))
          : invalid('密码参数无效或过长');
      case 'list_process': {
        const sorts = ['none', 'asc', 'desc'];
        const sort = args.sort === undefined ? 'none' : args.sort;
        if (!shortString(args.input) || typeof sort !== 'string' || !sorts.includes(sort))
          return invalid('列表参数无效或过长');
        if (args.deduplicate !== undefined && typeof args.deduplicate !== 'boolean')
          return invalid('去重参数无效');
        return success(
          JSON.stringify(
            processList(args.input, {
              deduplicate: args.deduplicate !== false,
              sort: sort as ListSort,
            }),
          ),
        );
      }
      case 'user_agent_parse':
        return shortString(args.input)
          ? success(JSON.stringify(parseUserAgent(args.input)))
          : invalid('User-Agent 参数无效或过长');
      case 'text_diff':
        return shortString(args.before) && shortString(args.after)
          ? success(JSON.stringify(diffTextLines(args.before, args.after)))
          : invalid('文本差异参数无效或过长');
      case 'hmac_hex': {
        const algorithms = ['SHA-256', 'SHA-384', 'SHA-512'];
        if (
          !shortString(args.key, 500) ||
          !shortString(args.message) ||
          !algorithms.includes(String(args.algorithm))
        )
          return invalid('HMAC 参数无效或过长');
        return success(
          await hmacHex(
            args.key,
            args.message,
            args.algorithm as 'SHA-256' | 'SHA-384' | 'SHA-512',
          ),
        );
      }
      case 'basic_auth_header':
        if (!shortString(args.username, 200) || !shortString(args.password, 500))
          return invalid('Basic Auth 参数无效或过长');
        return success(basicAuthHeader(args.username, args.password));
      case 'chmod_info':
        if (!shortString(args.input, 8)) return invalid('权限参数无效');
        return success(JSON.stringify(chmodInfo(args.input)));
      case 'ulid_generate':
        return success(generateUlid());
      case 'random_port':
        return success(String(randomPort()));
      case 'yaml_toml_transform': {
        if (
          !shortString(args.input) ||
          (args.mode !== 'yaml_to_toml' && args.mode !== 'toml_to_yaml')
        )
          return invalid('YAML/TOML 参数无效或过长');
        return fromResult(
          args.mode === 'yaml_to_toml' ? yamlToToml(args.input) : tomlToYaml(args.input),
        );
      }
      case 'og_meta':
        if (![args.title, args.description, args.url].every((item) => shortString(item, 500)))
          return invalid('Open Graph 参数无效或过长');
        if (args.image !== undefined && !shortString(args.image, 1000))
          return invalid('图片地址无效或过长');
        return success(
          generateOgTags({
            title: args.title as string,
            description: args.description as string,
            url: args.url as string,
            image: typeof args.image === 'string' ? args.image : undefined,
          }),
        );
      case 'svg_placeholder':
        if (
          !Number.isInteger(args.width) ||
          !Number.isInteger(args.height) ||
          !shortString(args.color, 7) ||
          !shortString(args.label, 80)
        )
          return invalid('占位图参数无效');
        return success(
          generateSvgPlaceholder(
            args.width as number,
            args.height as number,
            args.color as string,
            args.label as string,
          ),
        );
      case 'percentage': {
        if ((args.mode !== 'of' && args.mode !== 'share') || !finite(args.total))
          return invalid('百分比参数无效');
        if (args.mode === 'of') {
          if (!finite(args.percent)) return invalid('百分比参数无效');
          return success(String(percentOf(args.percent, args.total)));
        }
        if (!finite(args.part)) return invalid('百分比参数无效');
        return success(String(percentShare(args.part, args.total)));
      }
      case 'text_cipher':
        if (
          !shortString(args.input) ||
          !shortString(args.password, 200) ||
          (args.mode !== 'encrypt' && args.mode !== 'decrypt')
        )
          return invalid('加密参数无效或过长');
        return success(
          args.mode === 'encrypt'
            ? await encryptText(args.input, args.password)
            : await decryptText(args.input, args.password),
        );
      case 'totp': {
        if (args.mode === 'secret') return success(generateTotpSecret());
        if (args.mode !== 'code' || !shortString(args.secret, 128)) return invalid('TOTP 参数无效');
        const digits = args.digits === undefined ? 6 : args.digits;
        if (!Number.isInteger(digits)) return invalid('TOTP 位数无效');
        return success(await totp(args.secret, Math.floor(Date.now() / 1000), digits as number));
      }
      case 'rsa_key_pair':
        return success(JSON.stringify(await generateRsaKeyPair()));
      case 'xml_transform': {
        if (!shortString(args.input)) return invalid('XML 参数无效或过长');
        if (args.mode === 'format') return fromResult(formatXml(args.input));
        if (args.mode === 'to_json') return fromResult(xmlToJson(args.input));
        if (args.mode === 'from_json') return fromResult(jsonToXml(args.input));
        return invalid('XML 转换模式无效');
      }
      case 'lorem_ipsum':
        return Number.isInteger(args.paragraphs) &&
          Number(args.paragraphs) >= 1 &&
          Number(args.paragraphs) <= 20
          ? success(generateLoremIpsum(args.paragraphs as number))
          : invalid('段落数量必须在 1 到 20 之间');
      case 'text_mask':
        if (
          !shortString(args.input) ||
          !Number.isInteger(args.keepStart) ||
          !Number.isInteger(args.keepEnd) ||
          Number(args.keepStart) < 0 ||
          Number(args.keepEnd) < 0
        )
          return invalid('脱敏参数无效');
        return success(maskText(args.input, args.keepStart as number, args.keepEnd as number));
      case 'email_normalize':
        return shortString(args.input, 320)
          ? success(normalizeEmail(args.input))
          : invalid('邮箱参数无效或过长');
      case 'regex_cheatsheet':
        return shortString(args.query, 100)
          ? success(JSON.stringify(searchRegexCheatsheet(args.query)))
          : invalid('查询参数无效或过长');
      case 'ipv4_range':
        if (!shortString(args.start, 64) || !shortString(args.end, 64))
          return invalid('IPv4 范围参数无效');
        return success(JSON.stringify(expandIpv4Range(args.start, args.end)));
      case 'ipv6_ula':
        return success(generateIpv6Ula());
      case 'qr_code':
        return shortString(args.content, 2000)
          ? success(generateQrSvg(args.content))
          : invalid('二维码内容无效或过长');
      case 'wifi_qr': {
        const securities = ['WPA', 'WEP', 'nopass'];
        if (
          !shortString(args.ssid, 64) ||
          typeof args.security !== 'string' ||
          !securities.includes(args.security)
        )
          return invalid('WiFi 参数无效');
        if (args.password !== undefined && !shortString(args.password, 128))
          return invalid('WiFi 密码无效或过长');
        if (args.hidden !== undefined && typeof args.hidden !== 'boolean')
          return invalid('隐藏网络参数无效');
        return success(
          generateQrSvg(
            buildWifiPayload({
              ssid: args.ssid,
              password: typeof args.password === 'string' ? args.password : '',
              security: args.security as 'WPA' | 'WEP' | 'nopass',
              hidden: args.hidden === true,
            }),
          ),
        );
      }
      case 'math_expression':
        return shortString(args.input, 200)
          ? success(String(evaluateMathExpression(args.input)))
          : invalid('表达式无效或过长');
      case 'eta_calculate':
        return finite(args.distanceKm) && finite(args.speedKmH)
          ? success(String(calculateEtaSeconds(args.distanceKm, args.speedKmH)))
          : invalid('ETA 参数无效');
      case 'nato_alphabet':
        if (!shortString(args.input) || (args.mode !== 'to' && args.mode !== 'from'))
          return invalid('NATO 参数无效或过长');
        return success(
          args.mode === 'to' ? toNatoAlphabet(args.input) : fromNatoAlphabet(args.input),
        );
      case 'outlook_safe_link':
        return shortString(args.input)
          ? success(decodeOutlookSafeLink(args.input))
          : invalid('链接参数无效或过长');
      case 'git_command_lookup':
        return shortString(args.query, 100)
          ? success(JSON.stringify(findGitCommands(args.query)))
          : invalid('查询参数无效或过长');
      case 'emoji_lookup':
        return shortString(args.query, 100)
          ? success(JSON.stringify(findCommonEmojis(args.query)))
          : invalid('查询参数无效或过长');
      case 'iban_inspect':
        return shortString(args.input, 64)
          ? success(JSON.stringify(inspectIban(args.input)))
          : invalid('IBAN 参数无效或过长');
      case 'bcrypt': {
        if (!shortString(args.password, 72) || (args.mode !== 'hash' && args.mode !== 'verify'))
          return invalid('Bcrypt 参数无效');
        const cost = args.cost === undefined ? 10 : args.cost;
        if (!Number.isInteger(cost)) return invalid('Bcrypt 成本无效');
        if (args.mode === 'hash')
          return success(await generateBcryptHash(args.password, cost as number));
        if (!shortString(args.hash, 80)) return invalid('Bcrypt 哈希无效');
        return success(String(await verifyBcryptHash(args.password, args.hash)));
      }
      case 'bip39': {
        if (args.mode === 'generate') {
          const wordCount = args.wordCount === undefined ? 12 : args.wordCount;
          if (wordCount !== 12 && wordCount !== 24) return invalid('助记词长度无效');
          return success(generateMnemonicPhrase(wordCount));
        }
        if (!shortString(args.phrase, 400) || (args.mode !== 'validate' && args.mode !== 'seed'))
          return invalid('助记词参数无效');
        if (args.mode === 'validate') return success(String(validateMnemonicPhrase(args.phrase)));
        if (args.passphrase !== undefined && !shortString(args.passphrase, 200))
          return invalid('口令无效或过长');
        return success(
          await deriveMnemonicSeed(
            args.phrase,
            typeof args.passphrase === 'string' ? args.passphrase : '',
          ),
        );
      }
      case 'docker_run_to_compose':
        return shortString(args.input)
          ? success(dockerRunToCompose(args.input))
          : invalid('docker run 参数无效或过长');
      case 'phone_number':
        return shortString(args.input, 40) && shortString(args.region, 2)
          ? success(JSON.stringify(inspectPhoneNumber(args.input, args.region)))
          : invalid('电话号码参数无效');
      case 'token_generate': {
        if (!Number.isInteger(args.length) || Number(args.length) < 1 || Number(args.length) > 256)
          return invalid('令牌长度必须在 1 到 256 之间');
        const alphabet =
          args.alphabet === undefined
            ? 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
            : args.alphabet;
        if (!shortString(alphabet, 256)) return invalid('字符集无效或过长');
        return success(generateToken(args.length as number, alphabet));
      }
      case 'password_strength':
        return shortString(args.password, 256)
          ? success(JSON.stringify(analyzePasswordStrength(args.password)))
          : invalid('密码参数无效或过长');
      case 'ascii_text':
        return shortString(args.input, 40)
          ? success(drawAsciiText(args.input))
          : invalid('ASCII 文本无效或过长');
      case 'mac_vendor_lookup': {
        if (!shortString(args.input, 32)) return invalid('MAC 地址无效或过长');
        const vendor = await lookupMacVendor(args.input);
        return success(vendor ?? '未找到厂商');
      }
      case 'ip_lookup': {
        const input = args.input === undefined ? '' : args.input;
        if (!shortString(input, 64)) return invalid('IP 参数无效或过长');
        return success(JSON.stringify(await queryNetwork('ip', input, 'A', signal)));
      }
      case 'dns_lookup': {
        const types = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'CAA'];
        const type = args.type === undefined ? 'A' : args.type;
        if (!shortString(args.name, 253) || typeof type !== 'string' || !types.includes(type))
          return invalid('DNS 参数无效');
        return success(JSON.stringify(await queryNetwork('dns', args.name, type, signal)));
      }
      case 'rdap_lookup':
        return shortString(args.domain, 253)
          ? fetchTool(
              `/api/network/public-tools?${new URLSearchParams({ mode: 'rdap', input: args.domain.trim() })}`,
              signal,
            )
          : invalid('域名无效或过长');
      case 'http_headers':
        return shortString(args.url, 2000)
          ? fetchTool(
              `/api/network/public-tools?${new URLSearchParams({ mode: 'headers', input: args.url.trim() })}`,
              signal,
            )
          : invalid('URL 无效或过长');
      case 'github_lookup':
        return shortString(args.repository, 200)
          ? fetchTool(
              `/api/network/public-tools?${new URLSearchParams({ mode: 'github', input: args.repository.trim() })}`,
              signal,
            )
          : invalid('仓库名无效或过长');
      case 'npm_lookup':
        return shortString(args.name, 214)
          ? fetchTool(
              `/api/network/public-tools?${new URLSearchParams({ mode: 'npm', input: args.name.trim() })}`,
              signal,
            )
          : invalid('包名无效或过长');
      case 'http_request': {
        const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
        if (
          !shortString(args.url, 2000) ||
          typeof args.method !== 'string' ||
          !methods.includes(args.method as HttpMethod)
        )
          return invalid('HTTP 请求参数无效');
        if (args.body !== undefined && !shortString(args.body)) return invalid('请求体无效或过长');
        const headers: Record<string, string> = {};
        if (args.headers !== undefined) {
          if (!isRecord(args.headers) || Object.keys(args.headers).length > 20)
            return invalid('请求头无效');
          for (const [key, value] of Object.entries(args.headers)) {
            if (!shortString(key, 100) || !shortString(value, 500)) return invalid('请求头无效');
            headers[key] = value;
          }
        }
        const response = await sendHttpRequest(
          {
            url: args.url,
            method: args.method as HttpMethod,
            headers,
            body: typeof args.body === 'string' ? args.body : undefined,
          },
          signal,
        );
        return success(JSON.stringify(response));
      }
      default:
        return null;
    }
  } catch (error) {
    return caught(error, '工具执行失败');
  }
}

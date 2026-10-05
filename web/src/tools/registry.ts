import {
  Braces,
  Binary,
  CaseSensitive,
  CalendarClock,
  Clock3,
  Database,
  FileCode2,
  FileJson,
  FileText,
  Fingerprint,
  FlaskConical,
  GitCompareArrows,
  Globe2,
  KeyRound,
  Link2,
  ListFilter,
  LockKeyhole,
  MonitorSmartphone,
  Palette,
  Regex,
  ShieldCheck,
  Table2,
  WholeWord,
} from 'lucide-react';
import { lazy } from 'react';
const GithubLookupTool = lazy(() =>
  import('./components/public-lookup-tool-panels').then((module) => ({
    default: module.GithubLookupTool,
  })),
);
const NpmLookupTool = lazy(() =>
  import('./components/public-lookup-tool-panels').then((module) => ({
    default: module.NpmLookupTool,
  })),
);
const RdapLookupTool = lazy(() =>
  import('./components/public-lookup-tool-panels').then((module) => ({
    default: module.RdapLookupTool,
  })),
);
const HttpHeadersTool = lazy(() =>
  import('./components/public-lookup-tool-panels').then((module) => ({
    default: module.HttpHeadersTool,
  })),
);
const JevTool = lazy(() =>
  import('../features/jev/jev-tool').then((module) => ({ default: module.JevTool })),
);
const RadixTool = lazy(() =>
  import('./components/developer-tool-panels').then((module) => ({ default: module.RadixTool })),
);
const CsvJsonTool = lazy(() =>
  import('./components/data-inspection-tool-panels').then((module) => ({
    default: module.CsvJsonTool,
  })),
);
const JsonDiffTool = lazy(() =>
  import('./components/data-inspection-tool-panels').then((module) => ({
    default: module.JsonDiffTool,
  })),
);
const Base64FileTool = lazy(() =>
  import('./components/parity-file-base64-tool-panel').then((module) => ({
    default: module.Base64FileTool,
  })),
);
const CameraRecorderTool = lazy(() =>
  import('./components/parity-camera-tool-panel').then((module) => ({
    default: module.CameraRecorderTool,
  })),
);
const DockerComposeTool = lazy(() =>
  import('./components/parity-docker-compose-tool-panel').then((module) => ({
    default: module.DockerComposeTool,
  })),
);
const BenchmarkTool = lazy(() =>
  import('./components/parity-math-tool-panels').then((module) => ({
    default: module.BenchmarkTool,
  })),
);
const EtaTool = lazy(() =>
  import('./components/parity-math-tool-panels').then((module) => ({ default: module.EtaTool })),
);
const MathExpressionTool = lazy(() =>
  import('./components/parity-math-tool-panels').then((module) => ({
    default: module.MathExpressionTool,
  })),
);
const StopwatchTool = lazy(() =>
  import('./components/parity-math-tool-panels').then((module) => ({
    default: module.StopwatchTool,
  })),
);
const BasicAuthTool = lazy(() =>
  import('./components/parity-basics-tool-panels').then((module) => ({
    default: module.BasicAuthTool,
  })),
);
const ChmodTool = lazy(() =>
  import('./components/parity-basics-tool-panels').then((module) => ({
    default: module.ChmodTool,
  })),
);
const HmacTool = lazy(() =>
  import('./components/parity-basics-tool-panels').then((module) => ({ default: module.HmacTool })),
);
const HtmlEntitiesTool = lazy(() =>
  import('./components/parity-basics-tool-panels').then((module) => ({
    default: module.HtmlEntitiesTool,
  })),
);
const NumeronymTool = lazy(() =>
  import('./components/parity-basics-tool-panels').then((module) => ({
    default: module.NumeronymTool,
  })),
);
const RomanNumeralTool = lazy(() =>
  import('./components/parity-basics-tool-panels').then((module) => ({
    default: module.RomanNumeralTool,
  })),
);
const TextDiffTool = lazy(() =>
  import('./components/parity-basics-tool-panels').then((module) => ({
    default: module.TextDiffTool,
  })),
);
const TextStatsTool = lazy(() =>
  import('./components/parity-basics-tool-panels').then((module) => ({
    default: module.TextStatsTool,
  })),
);
const BinaryTextTool = lazy(() =>
  import('./components/parity-converters-tool-panels').then((module) => ({
    default: module.BinaryTextTool,
  })),
);
const RandomPortTool = lazy(() =>
  import('./components/parity-converters-tool-panels').then((module) => ({
    default: module.RandomPortTool,
  })),
);
const SlugifyTool = lazy(() =>
  import('./components/parity-converters-tool-panels').then((module) => ({
    default: module.SlugifyTool,
  })),
);
const TemperatureTool = lazy(() =>
  import('./components/parity-converters-tool-panels').then((module) => ({
    default: module.TemperatureTool,
  })),
);
const UlidTool = lazy(() =>
  import('./components/parity-converters-tool-panels').then((module) => ({
    default: module.UlidTool,
  })),
);
const UnicodeTextTool = lazy(() =>
  import('./components/parity-converters-tool-panels').then((module) => ({
    default: module.UnicodeTextTool,
  })),
);
const EncryptTextTool = lazy(() =>
  import('./components/parity-crypto-tool-panels').then((module) => ({
    default: module.EncryptTextTool,
  })),
);
const RsaKeyPairTool = lazy(() =>
  import('./components/parity-crypto-tool-panels').then((module) => ({
    default: module.RsaKeyPairTool,
  })),
);
const TotpTool = lazy(() =>
  import('./components/parity-crypto-tool-panels').then((module) => ({ default: module.TotpTool })),
);
const BcryptTool = lazy(() =>
  import('./components/parity-crypto-advanced-tool-panels').then((module) => ({
    default: module.BcryptTool,
  })),
);
const Bip39MnemonicTool = lazy(() =>
  import('./components/parity-crypto-advanced-tool-panels').then((module) => ({
    default: module.Bip39MnemonicTool,
  })),
);
const IbanTool = lazy(() =>
  import('./components/parity-iban-tool-panel').then((module) => ({ default: module.IbanTool })),
);
const Ipv4AddressTool = lazy(() =>
  import('./components/parity-network-tool-panels').then((module) => ({
    default: module.Ipv4AddressTool,
  })),
);
const Ipv4SubnetTool = lazy(() =>
  import('./components/parity-network-tool-panels').then((module) => ({
    default: module.Ipv4SubnetTool,
  })),
);
const MacAddressTool = lazy(() =>
  import('./components/parity-network-tool-panels').then((module) => ({
    default: module.MacAddressTool,
  })),
);
const Ipv4RangeTool = lazy(() =>
  import('./components/parity-network-extra-tool-panels').then((module) => ({
    default: module.Ipv4RangeTool,
  })),
);
const Ipv6UlaTool = lazy(() =>
  import('./components/parity-network-extra-tool-panels').then((module) => ({
    default: module.Ipv6UlaTool,
  })),
);
const EmailNormalizerTool = lazy(() =>
  import('./components/parity-text-misc-tool-panels').then((module) => ({
    default: module.EmailNormalizerTool,
  })),
);
const LoremIpsumTool = lazy(() =>
  import('./components/parity-text-misc-tool-panels').then((module) => ({
    default: module.LoremIpsumTool,
  })),
);
const RegexCheatsheetTool = lazy(() =>
  import('./components/parity-text-misc-tool-panels').then((module) => ({
    default: module.RegexCheatsheetTool,
  })),
);
const TextMaskTool = lazy(() =>
  import('./components/parity-text-misc-tool-panels').then((module) => ({
    default: module.TextMaskTool,
  })),
);
const OgMetaTool = lazy(() =>
  import('./components/parity-web-data-tool-panels').then((module) => ({
    default: module.OgMetaTool,
  })),
);
const PercentageTool = lazy(() =>
  import('./components/parity-web-data-tool-panels').then((module) => ({
    default: module.PercentageTool,
  })),
);
const SvgPlaceholderTool = lazy(() =>
  import('./components/parity-web-data-tool-panels').then((module) => ({
    default: module.SvgPlaceholderTool,
  })),
);
const YamlFormatTool = lazy(() =>
  import('./components/parity-web-data-tool-panels').then((module) => ({
    default: module.YamlFormatTool,
  })),
);
const YamlTomlTool = lazy(() =>
  import('./components/parity-web-data-tool-panels').then((module) => ({
    default: module.YamlTomlTool,
  })),
);
const QrCodeTool = lazy(() =>
  import('./components/parity-qr-tool-panels').then((module) => ({ default: module.QrCodeTool })),
);
const WifiQrCodeTool = lazy(() =>
  import('./components/parity-qr-tool-panels').then((module) => ({
    default: module.WifiQrCodeTool,
  })),
);
const EmojiPickerTool = lazy(() =>
  import('./components/parity-reference-more-tool-panels').then((module) => ({
    default: module.EmojiPickerTool,
  })),
);
const GitCommandsTool = lazy(() =>
  import('./components/parity-reference-more-tool-panels').then((module) => ({
    default: module.GitCommandsTool,
  })),
);
const NatoAlphabetTool = lazy(() =>
  import('./components/parity-reference-more-tool-panels').then((module) => ({
    default: module.NatoAlphabetTool,
  })),
);
const OutlookSafeLinkTool = lazy(() =>
  import('./components/parity-reference-more-tool-panels').then((module) => ({
    default: module.OutlookSafeLinkTool,
  })),
);
const DeviceInformationTool = lazy(() =>
  import('./components/parity-web-reference-tool-panels').then((module) => ({
    default: module.DeviceInformationTool,
  })),
);
const HttpStatusTool = lazy(() =>
  import('./components/parity-web-reference-tool-panels').then((module) => ({
    default: module.HttpStatusTool,
  })),
);
const KeycodeTool = lazy(() =>
  import('./components/parity-web-reference-tool-panels').then((module) => ({
    default: module.KeycodeTool,
  })),
);
const MimeTypeTool = lazy(() =>
  import('./components/parity-web-reference-tool-panels').then((module) => ({
    default: module.MimeTypeTool,
  })),
);
const JsonToXmlTool = lazy(() =>
  import('./components/parity-xml-tool-panels').then((module) => ({
    default: module.JsonToXmlTool,
  })),
);
const XmlFormatTool = lazy(() =>
  import('./components/parity-xml-tool-panels').then((module) => ({
    default: module.XmlFormatTool,
  })),
);
const XmlToJsonTool = lazy(() =>
  import('./components/parity-xml-tool-panels').then((module) => ({
    default: module.XmlToJsonTool,
  })),
);
const ColorTool = lazy(() =>
  import('./components/second-batch-tool-panels').then((module) => ({ default: module.ColorTool })),
);
const MarkdownTool = lazy(() =>
  import('./components/second-batch-tool-panels').then((module) => ({
    default: module.MarkdownTool,
  })),
);
const PasswordTool = lazy(() =>
  import('./components/second-batch-tool-panels').then((module) => ({
    default: module.PasswordTool,
  })),
);
const SqlTool = lazy(() =>
  import('./components/second-batch-tool-panels').then((module) => ({ default: module.SqlTool })),
);
const UserAgentTool = lazy(() =>
  import('./components/second-batch-tool-panels').then((module) => ({
    default: module.UserAgentTool,
  })),
);
const JsonTomlTool = lazy(() =>
  import('./components/structured-data-tool-panels').then((module) => ({
    default: module.JsonTomlTool,
  })),
);
const YamlJsonTool = lazy(() =>
  import('./components/structured-data-tool-panels').then((module) => ({
    default: module.YamlJsonTool,
  })),
);
const ListTool = lazy(() =>
  import('./components/text-tool-panels').then((module) => ({ default: module.ListTool })),
);
const TextCaseTool = lazy(() =>
  import('./components/text-tool-panels').then((module) => ({ default: module.TextCaseTool })),
);
const UrlTool = lazy(() =>
  import('./components/text-tool-panels').then((module) => ({ default: module.UrlTool })),
);
const Base64Tool = lazy(() =>
  import('./components/tool-panels').then((module) => ({ default: module.Base64Tool })),
);
const CronTool = lazy(() =>
  import('./components/tool-panels').then((module) => ({ default: module.CronTool })),
);
const HashTool = lazy(() =>
  import('./components/tool-panels').then((module) => ({ default: module.HashTool })),
);
const HttpTool = lazy(() =>
  import('./components/tool-panels').then((module) => ({ default: module.HttpTool })),
);
const JsonTool = lazy(() =>
  import('./components/tool-panels').then((module) => ({ default: module.JsonTool })),
);
const JwtTool = lazy(() =>
  import('./components/tool-panels').then((module) => ({ default: module.JwtTool })),
);
const RegexTool = lazy(() =>
  import('./components/tool-panels').then((module) => ({ default: module.RegexTool })),
);
const TimestampTool = lazy(() =>
  import('./components/tool-panels').then((module) => ({ default: module.TimestampTool })),
);
const UuidTool = lazy(() =>
  import('./components/tool-panels').then((module) => ({ default: module.UuidTool })),
);
const WeeklyReportTool = lazy(() =>
  import('./components/weekly-report-tool').then((module) => ({
    default: module.WeeklyReportTool,
  })),
);
import type { ToolCategory, ToolDefinition } from './types';
const PhoneNumberTool = lazy(() =>
  import('./components/parity-phone-tool-panel').then((module) => ({
    default: module.PhoneNumberTool,
  })),
);
const HtmlEditorTool = lazy(() =>
  import('./components/parity-html-editor-tool-panel').then((module) => ({
    default: module.HtmlEditorTool,
  })),
);
const TokenGeneratorTool = lazy(() =>
  import('./components/parity-small-gaps-tool-panels').then((module) => ({
    default: module.TokenGeneratorTool,
  })),
);
const PasswordStrengthTool = lazy(() =>
  import('./components/parity-small-gaps-tool-panels').then((module) => ({
    default: module.PasswordStrengthTool,
  })),
);
const AsciiTextTool = lazy(() =>
  import('./components/parity-small-gaps-tool-panels').then((module) => ({
    default: module.AsciiTextTool,
  })),
);
const MacVendorTool = lazy(() =>
  import('./components/parity-mac-vendor-tool-panel').then((module) => ({
    default: module.MacVendorTool,
  })),
);
const PdfSignatureTool = lazy(() =>
  import('./components/parity-pdf-signature-tool-panel').then((module) => ({
    default: module.PdfSignatureTool,
  })),
);
const IpLookupTool = lazy(() =>
  import('./components/network-lookup-tool-panels').then((module) => ({
    default: module.IpLookupTool,
  })),
);
const DnsLookupTool = lazy(() =>
  import('./components/network-lookup-tool-panels').then((module) => ({
    default: module.DnsLookupTool,
  })),
);
export const tools: ToolDefinition[] = [
  {
    name: 'JSON',
    slug: 'json',
    path: '/tools/json',
    category: '数据处理',
    keywords: ['格式化', '压缩', '校验'],
    description: '格式化、压缩并校验 JSON 数据。',
    icon: Braces,
    component: JsonTool,
  },
  {
    name: 'JSON 差异对比',
    slug: 'json-diff',
    path: '/tools/json-diff',
    category: '数据处理',
    keywords: ['JSON Patch', 'diff', '对比', '新增', '删除', '修改'],
    description: '按字段路径比较两份 JSON，并生成 JSON Patch。',
    icon: GitCompareArrows,
    component: JsonDiffTool,
  },
  {
    name: 'CSV/TSV ⇄ JSON',
    slug: 'csv-json',
    path: '/tools/csv-json',
    category: '数据处理',
    keywords: ['CSV', 'TSV', '表格', '制表符', '逗号', '转换'],
    description: '在表格文本与 JSON 对象数组之间转换。',
    icon: Table2,
    component: CsvJsonTool,
  },
  {
    name: 'Base64',
    slug: 'base64',
    path: '/tools/base64',
    category: '编码转换',
    keywords: ['编码', '解码', 'UTF-8'],
    description: '在 UTF-8 文本与 Base64 之间可靠转换。',
    icon: WholeWord,
    component: Base64Tool,
  },
  {
    name: 'YAML ⇄ JSON',
    slug: 'yaml-json',
    path: '/tools/yaml-json',
    category: '数据处理',
    keywords: ['YAML', 'JSON', '转换', '配置'],
    description: '在 YAML 与格式化 JSON 之间双向转换。',
    icon: FileJson,
    component: YamlJsonTool,
  },
  {
    name: 'JSON ⇄ TOML',
    slug: 'json-toml',
    path: '/tools/json-toml',
    category: '数据处理',
    keywords: ['JSON', 'TOML', '转换', '配置'],
    description: '在 JSON 对象与 TOML 配置之间双向转换。',
    icon: FileCode2,
    component: JsonTomlTool,
  },
  {
    name: 'URL 编解码',
    slug: 'url',
    path: '/tools/url',
    category: '编码转换',
    keywords: ['URL', 'URI', '百分号', '查询参数', 'Query'],
    description: '编码、解码 URL 组件并解析查询参数。',
    icon: Link2,
    component: UrlTool,
  },
  {
    name: '文本大小写',
    slug: 'text-case',
    path: '/tools/text-case',
    category: '数据处理',
    keywords: ['camelCase', 'snake_case', 'kebab-case', '命名'],
    description: '转换常见变量命名和单词大小写格式。',
    icon: CaseSensitive,
    component: TextCaseTool,
  },
  {
    name: '列表处理',
    slug: 'list',
    path: '/tools/list',
    category: '数据处理',
    keywords: ['列表', '去重', '排序', '统计', '按行'],
    description: '按行清理、去重和排序，并统计处理结果。',
    icon: ListFilter,
    component: ListTool,
  },
  {
    name: '进制转换',
    slug: 'radix',
    path: '/tools/radix',
    category: '编码转换',
    keywords: ['二进制', '八进制', '十进制', '十六进制', 'BigInt'],
    description: '转换二、八、十和十六进制整数。',
    icon: Binary,
    component: RadixTool,
  },
  {
    name: 'JWT 解码',
    slug: 'jwt',
    path: '/tools/jwt',
    category: '编码转换',
    keywords: ['令牌', 'Header', 'Payload'],
    description: '本地查看 JWT Header 与 Payload，不验证签名。',
    icon: ShieldCheck,
    component: JwtTool,
  },
  {
    name: '文本哈希',
    slug: 'hash',
    path: '/tools/hash',
    category: '数据处理',
    keywords: ['SHA', '摘要', '校验和'],
    description: '计算 SHA-1、SHA-256、SHA-384 和 SHA-512。',
    icon: Fingerprint,
    component: HashTool,
  },
  {
    name: '时间戳',
    slug: 'timestamp',
    path: '/tools/timestamp',
    category: '日期时间',
    keywords: ['Unix', 'ISO', '日期'],
    description: '转换秒、毫秒时间戳与 ISO 日期时间。',
    icon: Clock3,
    component: TimestampTool,
  },
  {
    name: 'UUID',
    slug: 'uuid',
    path: '/tools/uuid',
    category: '开发辅助',
    keywords: ['v4', '随机', '标识符'],
    description: '使用安全随机源批量生成 UUID v4。',
    icon: KeyRound,
    component: UuidTool,
  },
  {
    name: 'Cron',
    slug: 'cron',
    path: '/tools/cron',
    category: '开发辅助',
    keywords: ['定时', '计划任务', '五段'],
    description: '解析标准五段 Cron，并查看后续运行时间。',
    icon: CalendarClock,
    component: CronTool,
  },
  {
    name: '正则表达式',
    slug: 'regex',
    path: '/tools/regex',
    category: '开发辅助',
    keywords: ['匹配', '捕获组', 'flags'],
    description: '测试 JavaScript 正则并检查匹配与捕获组。',
    icon: Regex,
    component: RegexTool,
  },
  {
    name: '周报生成',
    slug: 'weekly-report',
    path: '/tools/weekly-report',
    category: '开发辅助',
    keywords: ['周报', '团队', '项目汇总', '表格'],
    description: '把表格数据整理成团队与个人周报。',
    icon: FileText,
    component: WeeklyReportTool,
  },
  {
    name: 'Markdown 转 HTML',
    slug: 'markdown',
    path: '/tools/markdown',
    category: '数据处理',
    keywords: ['Markdown', 'HTML', '安全预览'],
    description: '转换 Markdown，并查看清理后的 HTML 与安全预览。',
    icon: FileText,
    component: MarkdownTool,
  },
  {
    name: 'SQL 格式化',
    slug: 'sql',
    path: '/tools/sql',
    category: '开发辅助',
    keywords: ['SQL', '查询', '排版', '缩进'],
    description: '排版 SQL 语句，不执行查询。',
    icon: Database,
    component: SqlTool,
  },
  {
    name: '密码生成',
    slug: 'password',
    path: '/tools/password',
    category: '开发辅助',
    keywords: ['密码', '随机', '强度'],
    description: '使用安全随机源生成密码并分析强度。',
    icon: LockKeyhole,
    component: PasswordTool,
  },
  {
    name: 'Jev 调用试炼场',
    slug: 'jev',
    path: '/tools/jev',
    category: '开发辅助',
    keywords: ['Jev', 'TypeSafe AI', 'Choice', 'Score', 'Noul', 'AI'],
    description: '编辑结构化问题，调用 TypeSafe Jev 并查看概率与置信度。',
    icon: FlaskConical,
    component: JevTool,
  },
  {
    name: '颜色转换',
    slug: 'color',
    path: '/tools/color',
    category: '数据处理',
    keywords: ['颜色', 'HEX', 'RGB', 'HSL'],
    description: '转换 HEX、RGB 和 HSL，预览并复制结果。',
    icon: Palette,
    component: ColorTool,
  },
  {
    name: 'HTTP 请求',
    slug: 'http',
    path: '/tools/http',
    category: '网络工具',
    keywords: ['API', 'REST', '代理'],
    description: '通过受保护的本地代理发送 HTTP 请求。',
    icon: Globe2,
    component: HttpTool,
  },
  {
    name: 'User-Agent 解析',
    slug: 'user-agent',
    path: '/tools/user-agent',
    category: '网络工具',
    keywords: ['User-Agent', 'UA', '浏览器', '设备', '系统'],
    description: '从 User-Agent 文本识别浏览器、系统和设备。',
    icon: MonitorSmartphone,
    component: UserAgentTool,
  },
  {
    name: 'HTML 实体编解码',
    slug: 'html-entities',
    path: '/tools/html-entities',
    category: '编码转换',
    keywords: ['HTML 实体', 'escape', 'unescape', '转义'],
    description: '转义或还原 HTML 特殊字符与数字实体。',
    icon: Braces,
    component: HtmlEntitiesTool,
  },
  {
    name: '文本差异对比',
    slug: 'text-diff',
    path: '/tools/text-diff',
    category: '数据处理',
    keywords: ['文本差异', 'diff', '逐行', '对比'],
    description: '逐行比较两份文本，标出新增和删除。',
    icon: GitCompareArrows,
    component: TextDiffTool,
  },
  {
    name: 'HMAC 生成',
    slug: 'hmac',
    path: '/tools/hmac',
    category: '开发辅助',
    keywords: ['HMAC', 'SHA-256', '签名', '密钥'],
    description: '使用浏览器加密 API 计算 HMAC 摘要。',
    icon: Fingerprint,
    component: HmacTool,
  },
  {
    name: 'Basic Auth 请求头',
    slug: 'basic-auth',
    path: '/tools/basic-auth',
    category: '编码转换',
    keywords: ['Basic Auth', 'Authorization', 'HTTP', '用户名'],
    description: '从用户名和密码生成 Basic Authorization 请求头。',
    icon: LockKeyhole,
    component: BasicAuthTool,
  },
  {
    name: 'Chmod 权限计算',
    slug: 'chmod',
    path: '/tools/chmod',
    category: '开发辅助',
    keywords: ['chmod', '权限', '八进制', 'rwx'],
    description: '查看八进制权限对应的 rwx 表示与命令。',
    icon: ShieldCheck,
    component: ChmodTool,
  },
  {
    name: '罗马数字转换',
    slug: 'roman-numeral',
    path: '/tools/roman-numeral',
    category: '编码转换',
    keywords: ['罗马数字', 'Roman', '整数'],
    description: '在 1–3999 的整数与罗马数字之间转换。',
    icon: Binary,
    component: RomanNumeralTool,
  },
  {
    name: '文本统计',
    slug: 'text-stats',
    path: '/tools/text-stats',
    category: '数据处理',
    keywords: ['文本统计', '字符', '词语', '行数', '字节'],
    description: '统计字符、词语、行数和 UTF-8 字节数。',
    icon: FileText,
    component: TextStatsTool,
  },
  {
    name: '数字缩写',
    slug: 'numeronym',
    path: '/tools/numeronym',
    category: '数据处理',
    keywords: ['数字缩写', 'numeronym', 'i18n', 'l10n'],
    description: '把长词转换为 i18n 一类的数字缩写。',
    icon: CaseSensitive,
    component: NumeronymTool,
  },
  {
    name: 'ULID 生成',
    slug: 'ulid',
    path: '/tools/ulid',
    category: '开发辅助',
    keywords: ['ULID', '标识符', '时间排序'],
    description: '生成可按时间排序的 ULID 标识符。',
    icon: KeyRound,
    component: UlidTool,
  },
  {
    name: '随机端口',
    slug: 'random-port',
    path: '/tools/random-port',
    category: '网络工具',
    keywords: ['随机端口', '动态端口', 'port'],
    description: '从动态端口范围生成随机端口号。',
    icon: Globe2,
    component: RandomPortTool,
  },
  {
    name: '二进制文本转换',
    slug: 'binary-text',
    path: '/tools/binary-text',
    category: '编码转换',
    keywords: ['二进制文本', 'UTF-8', '字节'],
    description: '在 UTF-8 文本与八位二进制字节之间转换。',
    icon: Binary,
    component: BinaryTextTool,
  },
  {
    name: 'Unicode 码点转换',
    slug: 'unicode-text',
    path: '/tools/unicode-text',
    category: '编码转换',
    keywords: ['Unicode', '码点', 'U+'],
    description: '在文本与 Unicode 码点序列之间转换。',
    icon: Braces,
    component: UnicodeTextTool,
  },
  {
    name: 'Slug 生成',
    slug: 'slugify',
    path: '/tools/slugify',
    category: '数据处理',
    keywords: ['Slug', 'URL', '文件名', '短横线'],
    description: '将标题整理为适合 URL 的短横线名称。',
    icon: Link2,
    component: SlugifyTool,
  },
  {
    name: '温度转换',
    slug: 'temperature',
    path: '/tools/temperature',
    category: '数据处理',
    keywords: ['温度', '摄氏度', '华氏度', '开尔文'],
    description: '在摄氏度、华氏度和开尔文之间转换。',
    icon: Clock3,
    component: TemperatureTool,
  },
  {
    name: 'YAML ⇄ TOML',
    slug: 'yaml-toml',
    path: '/tools/yaml-toml',
    category: '数据处理',
    keywords: ['YAML TOML', '配置', '转换'],
    description: '在 YAML 与 TOML 配置之间双向转换。',
    icon: FileCode2,
    component: YamlTomlTool,
  },
  {
    name: 'YAML 格式化',
    slug: 'yaml-format',
    path: '/tools/yaml-format',
    category: '数据处理',
    keywords: ['YAML 格式化', '排版', '注释'],
    description: '格式化 YAML，同时保留注释。',
    icon: FileJson,
    component: YamlFormatTool,
  },
  {
    name: 'Open Graph 标签',
    slug: 'og-meta',
    path: '/tools/og-meta',
    category: '开发辅助',
    keywords: ['Open Graph', 'OG', 'meta', '社交分享'],
    description: '生成页面分享预览所需的 OG meta 标签。',
    icon: FileCode2,
    component: OgMetaTool,
  },
  {
    name: 'SVG 占位图',
    slug: 'svg-placeholder',
    path: '/tools/svg-placeholder',
    category: '开发辅助',
    keywords: ['SVG 占位图', '图片', '尺寸', '颜色'],
    description: '生成可复制的自定义尺寸 SVG 占位图。',
    icon: Palette,
    component: SvgPlaceholderTool,
  },
  {
    name: '百分比计算',
    slug: 'percentage',
    path: '/tools/percentage',
    category: '数据处理',
    keywords: ['百分比', '百分数', '比例'],
    description: '计算某数占比，或某数的指定百分比。',
    icon: Binary,
    component: PercentageTool,
  },
  {
    name: '文本加密与解密',
    slug: 'text-encryption',
    path: '/tools/text-encryption',
    category: '编码转换',
    keywords: ['AES-GCM', '加密', '解密', '口令'],
    description: '使用浏览器加密 API 和口令加密、解密文本。',
    icon: LockKeyhole,
    component: EncryptTextTool,
  },
  {
    name: 'TOTP 验证码',
    slug: 'totp',
    path: '/tools/totp',
    category: '开发辅助',
    keywords: ['TOTP', 'OTP', '双因素', 'Base32'],
    description: '在浏览器中生成 Base32 密钥与六位验证码。',
    icon: KeyRound,
    component: TotpTool,
  },
  {
    name: 'RSA 密钥对',
    slug: 'rsa-key-pair',
    path: '/tools/rsa-key-pair',
    category: '开发辅助',
    keywords: ['RSA', 'PEM', '公钥', '私钥'],
    description: '生成 RSA-OAEP 2048 位 PEM 密钥对。',
    icon: ShieldCheck,
    component: RsaKeyPairTool,
  },
  {
    name: 'XML 格式化',
    slug: 'xml-format',
    path: '/tools/xml-format',
    category: '数据处理',
    keywords: ['XML 格式化', '校验', '排版'],
    description: '校验并格式化 XML 文本。',
    icon: FileCode2,
    component: XmlFormatTool,
  },
  {
    name: 'XML 转 JSON',
    slug: 'xml-to-json',
    path: '/tools/xml-to-json',
    category: '数据处理',
    keywords: ['XML 转 JSON', '属性', '转换'],
    description: '按明确的属性和重复节点规则转换 XML。',
    icon: FileJson,
    component: XmlToJsonTool,
  },
  {
    name: 'JSON 转 XML',
    slug: 'json-to-xml',
    path: '/tools/json-to-xml',
    category: '数据处理',
    keywords: ['JSON 转 XML', '转换', '元素'],
    description: '将单根 JSON 对象转换为 XML。',
    icon: FileCode2,
    component: JsonToXmlTool,
  },
  {
    name: 'IPv4 子网计算',
    slug: 'ipv4-subnet',
    path: '/tools/ipv4-subnet',
    category: '网络工具',
    keywords: ['IPv4 子网', 'CIDR', '掩码', '广播地址'],
    description: '计算 IPv4 CIDR 网络、掩码和地址范围。',
    icon: Globe2,
    component: Ipv4SubnetTool,
  },
  {
    name: 'IPv4 地址转换',
    slug: 'ipv4-address',
    path: '/tools/ipv4-address',
    category: '网络工具',
    keywords: ['IPv4 地址', '十进制', '十六进制', '二进制'],
    description: '在 IPv4 点分地址与整数表示之间转换。',
    icon: Binary,
    component: Ipv4AddressTool,
  },
  {
    name: 'MAC 地址生成',
    slug: 'mac-address',
    path: '/tools/mac-address',
    category: '网络工具',
    keywords: ['MAC 地址', '单播', '随机'],
    description: '生成本地管理的随机单播 MAC 地址。',
    icon: MonitorSmartphone,
    component: MacAddressTool,
  },
  {
    name: 'MIME 类型查询',
    slug: 'mime-types',
    path: '/tools/mime-types',
    category: '开发辅助',
    keywords: ['MIME', '扩展名', 'Content-Type'],
    description: '查询常见文件扩展名与 MIME 类型。',
    icon: FileText,
    component: MimeTypeTool,
  },
  {
    name: 'HTTP 状态码',
    slug: 'http-status',
    path: '/tools/http-status',
    category: '网络工具',
    keywords: ['HTTP 状态码', '404', '500', '响应'],
    description: '查询常见 HTTP 状态码与含义。',
    icon: Globe2,
    component: HttpStatusTool,
  },
  {
    name: '设备信息',
    slug: 'device-info',
    path: '/tools/device-info',
    category: '开发辅助',
    keywords: ['设备信息', '浏览器', '视口', '屏幕'],
    description: '查看当前浏览器可读取的设备信息。',
    icon: MonitorSmartphone,
    component: DeviceInformationTool,
  },
  {
    name: 'Keycode 信息',
    slug: 'keycode',
    path: '/tools/keycode',
    category: '开发辅助',
    keywords: ['Keycode', '键盘', 'KeyboardEvent', '按键'],
    description: '查看按键事件的 key、code 与修饰键。',
    icon: CaseSensitive,
    component: KeycodeTool,
  },
  {
    name: 'Lorem Ipsum 生成',
    slug: 'lorem-ipsum',
    path: '/tools/lorem-ipsum',
    category: '数据处理',
    keywords: ['Lorem Ipsum', '占位文本', '段落'],
    description: '生成指定段落数量的占位文本。',
    icon: FileText,
    component: LoremIpsumTool,
  },
  {
    name: '文本脱敏',
    slug: 'text-mask',
    path: '/tools/text-mask',
    category: '数据处理',
    keywords: ['文本脱敏', '遮蔽', '敏感信息'],
    description: '保留两端字符，遮蔽中间内容。',
    icon: LockKeyhole,
    component: TextMaskTool,
  },
  {
    name: 'Email 标准化',
    slug: 'email-normalizer',
    path: '/tools/email-normalizer',
    category: '数据处理',
    keywords: ['Email 标准化', '邮箱', '域名'],
    description: '去除两端空白并统一邮箱域名大小写。',
    icon: CaseSensitive,
    component: EmailNormalizerTool,
  },
  {
    name: '正则速查',
    slug: 'regex-cheatsheet',
    path: '/tools/regex-cheatsheet',
    category: '开发辅助',
    keywords: ['正则速查', 'regex', 'cheatsheet', 'JavaScript'],
    description: '查阅常用 JavaScript 正则表达式语法。',
    icon: Regex,
    component: RegexCheatsheetTool,
  },
  {
    name: 'IPv4 范围展开',
    slug: 'ipv4-range',
    path: '/tools/ipv4-range',
    category: '网络工具',
    keywords: ['IPv4 范围', 'CIDR', '起始地址', '结束地址'],
    description: '将 IPv4 地址范围拆分为最少的 CIDR 块。',
    icon: Globe2,
    component: Ipv4RangeTool,
  },
  {
    name: 'IPv6 ULA 前缀',
    slug: 'ipv6-ula',
    path: '/tools/ipv6-ula',
    category: '网络工具',
    keywords: ['IPv6 ULA', '本地地址', '前缀'],
    description: '生成随机的本地 IPv6 /48 前缀。',
    icon: Globe2,
    component: Ipv6UlaTool,
  },
  {
    name: 'Base64 文件转换',
    slug: 'base64-file',
    path: '/tools/base64-file',
    category: '编码转换',
    keywords: ['Base64 文件', 'Data URL', '文件编码'],
    description: '将本地文件转换为 Base64 Data URL。',
    icon: FileText,
    component: Base64FileTool,
  },
  {
    name: '二维码生成',
    slug: 'qr-code',
    path: '/tools/qr-code',
    category: '开发辅助',
    keywords: ['二维码', 'QR Code', 'SVG'],
    description: '从文本生成可下载的 SVG 二维码。',
    icon: Braces,
    component: QrCodeTool,
  },
  {
    name: 'WiFi 二维码',
    slug: 'wifi-qr-code',
    path: '/tools/wifi-qr-code',
    category: '网络工具',
    keywords: ['WiFi 二维码', 'SSID', '无线网络', 'QR Code'],
    description: '生成用于连接 WiFi 的二维码。',
    icon: Globe2,
    component: WifiQrCodeTool,
  },
  {
    name: '数学表达式计算',
    slug: 'math-expression',
    path: '/tools/math-expression',
    category: '开发辅助',
    keywords: ['数学表达式', '计算器', 'sqrt', 'sin'],
    description: '安全解析并计算常见数学表达式。',
    icon: Binary,
    component: MathExpressionTool,
  },
  {
    name: 'ETA 计算',
    slug: 'eta',
    path: '/tools/eta',
    category: '日期时间',
    keywords: ['ETA', '预计耗时', '距离', '速度'],
    description: '根据距离和速度估算耗时。',
    icon: Clock3,
    component: EtaTool,
  },
  {
    name: '秒表',
    slug: 'stopwatch',
    path: '/tools/stopwatch',
    category: '日期时间',
    keywords: ['秒表', '计时', '暂停'],
    description: '开始、暂停和重置浏览器内秒表。',
    icon: Clock3,
    component: StopwatchTool,
  },
  {
    name: '基准测试',
    slug: 'benchmark',
    path: '/tools/benchmark',
    category: '开发辅助',
    keywords: ['基准测试', 'Benchmark', '性能'],
    description: '在固定场景中粗略测量浏览器执行时间。',
    icon: FlaskConical,
    component: BenchmarkTool,
  },
  {
    name: 'NATO 字母表',
    slug: 'nato-alphabet',
    path: '/tools/nato-alphabet',
    category: '数据处理',
    keywords: ['NATO', '字母表', '拼读'],
    description: '在普通文本和 NATO 拼读字母之间转换。',
    icon: CaseSensitive,
    component: NatoAlphabetTool,
  },
  {
    name: 'Outlook Safe Links 解码',
    slug: 'outlook-safe-link',
    path: '/tools/outlook-safe-link',
    category: '编码转换',
    keywords: ['Outlook Safe Links', '安全链接', '解码'],
    description: '提取 Outlook Safe Links 包装的目标地址。',
    icon: Link2,
    component: OutlookSafeLinkTool,
  },
  {
    name: 'Git 命令速查',
    slug: 'git-commands',
    path: '/tools/git-commands',
    category: '开发辅助',
    keywords: ['Git 命令', '速查', '版本控制'],
    description: '搜索常用 Git 命令及其用途。',
    icon: FileCode2,
    component: GitCommandsTool,
  },
  {
    name: 'Emoji 选择器',
    slug: 'emoji-picker',
    path: '/tools/emoji-picker',
    category: '开发辅助',
    keywords: ['Emoji', '表情', 'Unicode'],
    description: '搜索并复制常用 Emoji。',
    icon: Braces,
    component: EmojiPickerTool,
  },
  {
    name: 'IBAN 校验',
    slug: 'iban',
    path: '/tools/iban',
    category: '开发辅助',
    keywords: ['IBAN', '国际银行账号', 'MOD 97'],
    description: '本地检查 IBAN 国家格式、长度与校验位。',
    icon: ShieldCheck,
    component: IbanTool,
  },
  {
    name: 'Bcrypt 哈希',
    slug: 'bcrypt',
    path: '/tools/bcrypt',
    category: '开发辅助',
    keywords: ['Bcrypt', '密码哈希', '验证'],
    description: '在本地生成与验证 Bcrypt 密码哈希。',
    icon: LockKeyhole,
    component: BcryptTool,
  },
  {
    name: 'BIP39 助记词',
    slug: 'bip39-mnemonic',
    path: '/tools/bip39-mnemonic',
    category: '开发辅助',
    keywords: ['BIP39', '助记词', '种子'],
    description: '生成、校验英文助记词并派生种子。',
    icon: KeyRound,
    component: Bip39MnemonicTool,
  },
  {
    name: '摄像头拍照与录像',
    slug: 'camera-recorder',
    path: '/tools/camera-recorder',
    category: '开发辅助',
    keywords: ['摄像头', '拍照', '录像', 'Camera'],
    description: '经授权后在浏览器内拍照或录制短视频。',
    icon: MonitorSmartphone,
    component: CameraRecorderTool,
  },
  {
    name: 'Docker Run 转 Compose',
    slug: 'docker-compose',
    path: '/tools/docker-compose',
    category: '开发辅助',
    keywords: ['Docker', 'Compose', 'docker run', 'YAML'],
    description: '将常用 docker run 参数转换为 Compose YAML。',
    icon: FileCode2,
    component: DockerComposeTool,
  },
  {
    name: '电话号码解析与格式化',
    slug: 'phone-number',
    path: '/tools/phone-number',
    category: '数据处理',
    keywords: ['电话号码', 'E.164', 'Phone', '地区'],
    description: '按地区解析和格式化国际电话号码。',
    icon: MonitorSmartphone,
    component: PhoneNumberTool,
  },
  {
    name: 'HTML 编辑与预览',
    slug: 'html-editor',
    path: '/tools/html-editor',
    category: '开发辅助',
    keywords: ['HTML 编辑', 'WYSIWYG', '富文本'],
    description: '可视化编辑富文本并输出安全清理的 HTML。',
    icon: FileCode2,
    component: HtmlEditorTool,
  },
  {
    name: '令牌生成',
    slug: 'token-generator',
    path: '/tools/token-generator',
    category: '开发辅助',
    keywords: ['令牌生成', 'Token', '安全随机'],
    description: '按指定长度和字符集生成随机令牌。',
    icon: KeyRound,
    component: TokenGeneratorTool,
  },
  {
    name: '密码强度提示',
    slug: 'password-strength',
    path: '/tools/password-strength',
    category: '开发辅助',
    keywords: ['密码强度', '密码分析', '安全'],
    description: '用启发式规则给出密码强度提示。',
    icon: ShieldCheck,
    component: PasswordStrengthTool,
  },
  {
    name: 'ASCII 字画',
    slug: 'ascii-text',
    path: '/tools/ascii-text',
    category: '数据处理',
    keywords: ['ASCII 字画', '文字绘制', '字符画'],
    description: '把英文字母和数字绘制成五行字符画。',
    icon: FileText,
    component: AsciiTextTool,
  },
  {
    name: 'MAC 厂商查询',
    slug: 'mac-vendor',
    path: '/tools/mac-vendor',
    category: '网络工具',
    keywords: ['MAC 厂商', 'OUI', 'Vendor'],
    description: '用本地 OUI 数据库查询 MAC 前缀对应的厂商。',
    icon: MonitorSmartphone,
    component: MacVendorTool,
  },
  {
    name: 'PDF 签名证书查看',
    slug: 'pdf-signature',
    path: '/tools/pdf-signature',
    category: '开发辅助',
    keywords: ['PDF 签名', '证书', '数字签名'],
    description: '本地查看 PDF 嵌入证书，不验证签名有效性。',
    icon: ShieldCheck,
    component: PdfSignatureTool,
  },
  {
    name: 'IP 查询',
    slug: 'ip-lookup',
    path: '/tools/ip-lookup',
    category: '网络工具',
    keywords: ['IP 查询', '公网 IP', '归属地', '运营商', 'ASN', 'IPv6'],
    description: '查询公网 IP 的归属地、运营商、ASN 与时区。',
    icon: Globe2,
    component: IpLookupTool,
  },
  {
    name: 'DNS 查询',
    slug: 'dns-lookup',
    path: '/tools/dns-lookup',
    category: '网络工具',
    keywords: ['DNS 查询', '域名解析', 'A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME'],
    description: '查询域名的 DNS 记录、记录值与 TTL。',
    icon: Globe2,
    component: DnsLookupTool,
  },
  {
    name: 'RDAP / WHOIS 查询',
    slug: 'rdap-lookup',
    path: '/tools/rdap-lookup',
    category: '网络工具',
    keywords: ['WHOIS', 'RDAP', '注册商', '域名到期'],
    description: '通过 RDAP 查询域名注册信息、状态和域名服务器。',
    icon: Globe2,
    component: RdapLookupTool,
  },
  {
    name: 'HTTP 响应头',
    slug: 'http-headers',
    path: '/tools/http-headers',
    category: '网络工具',
    keywords: ['响应头', 'headers', '缓存', '重定向', '安全头'],
    description: '只读查询公网 HTTPS 状态、跳转链和响应头。',
    icon: Globe2,
    component: HttpHeadersTool,
  },
  {
    name: 'GitHub 仓库查询',
    slug: 'github-lookup',
    path: '/tools/github-lookup',
    category: '开发辅助',
    keywords: ['GitHub', 'Stars', 'Release', '许可证'],
    description: '查询公开仓库信息、许可证和最新 Release。',
    icon: FileCode2,
    component: GithubLookupTool,
  },
  {
    name: 'npm 包查询',
    slug: 'npm-lookup',
    path: '/tools/npm-lookup',
    category: '开发辅助',
    keywords: ['npm', '包依赖', '版本', '下载量'],
    description: '查询 npm 最新版本、依赖和上周下载量。',
    icon: FileCode2,
    component: NpmLookupTool,
  },
];
export const findTool = (slug: string) => tools.find((tool) => tool.slug === slug);
export function searchTools(query: string) {
  const normalized = query.trim().toLocaleLowerCase('zh-CN');
  if (!normalized) return tools;
  return tools.filter((tool) =>
    [tool.name, tool.category, tool.description, ...tool.keywords]
      .join(' ')
      .toLocaleLowerCase('zh-CN')
      .includes(normalized),
  );
}
export function groupToolsByCategory(items: ToolDefinition[]) {
  const groups = new Map<ToolCategory, ToolDefinition[]>();
  for (const item of items) groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
  return groups;
}

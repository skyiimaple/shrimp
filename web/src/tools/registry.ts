import { Braces, CalendarClock, Clock3, FileText, Fingerprint, Globe2, KeyRound, Regex, ShieldCheck, WholeWord } from 'lucide-react'
import { Base64Tool, CronTool, HashTool, HttpTool, JsonTool, JwtTool, RegexTool, TimestampTool, UuidTool } from './components/tool-panels'
import { WeeklyReportTool } from './components/weekly-report-tool'
import type { ToolCategory, ToolDefinition } from './types'
export const tools: ToolDefinition[] = [
  { name: 'JSON', slug: 'json', path: '/tools/json', category: '数据处理', keywords: ['格式化', '压缩', '校验'], description: '格式化、压缩并校验 JSON 数据。', icon: Braces, component: JsonTool },
  { name: 'Base64', slug: 'base64', path: '/tools/base64', category: '编码转换', keywords: ['编码', '解码', 'UTF-8'], description: '在 UTF-8 文本与 Base64 之间可靠转换。', icon: WholeWord, component: Base64Tool },
  { name: 'JWT 解码', slug: 'jwt', path: '/tools/jwt', category: '编码转换', keywords: ['令牌', 'Header', 'Payload'], description: '本地查看 JWT Header 与 Payload，不验证签名。', icon: ShieldCheck, component: JwtTool },
  { name: '文本哈希', slug: 'hash', path: '/tools/hash', category: '数据处理', keywords: ['SHA', '摘要', '校验和'], description: '计算 SHA-1、SHA-256、SHA-384 和 SHA-512。', icon: Fingerprint, component: HashTool },
  { name: '时间戳', slug: 'timestamp', path: '/tools/timestamp', category: '日期时间', keywords: ['Unix', 'ISO', '日期'], description: '转换秒、毫秒时间戳与 ISO 日期时间。', icon: Clock3, component: TimestampTool },
  { name: 'UUID', slug: 'uuid', path: '/tools/uuid', category: '开发辅助', keywords: ['v4', '随机', '标识符'], description: '使用安全随机源批量生成 UUID v4。', icon: KeyRound, component: UuidTool },
  { name: 'Cron', slug: 'cron', path: '/tools/cron', category: '开发辅助', keywords: ['定时', '计划任务', '五段'], description: '解析标准五段 Cron，并查看后续运行时间。', icon: CalendarClock, component: CronTool },
  { name: '正则表达式', slug: 'regex', path: '/tools/regex', category: '开发辅助', keywords: ['匹配', '捕获组', 'flags'], description: '测试 JavaScript 正则并检查匹配与捕获组。', icon: Regex, component: RegexTool },
  { name: '周报生成', slug: 'weekly-report', path: '/tools/weekly-report', category: '开发辅助', keywords: ['周报', '团队', '项目汇总', '表格'], description: '把表格数据整理成团队与个人周报。', icon: FileText, component: WeeklyReportTool },
  { name: 'HTTP 请求', slug: 'http', path: '/tools/http', category: '网络工具', keywords: ['API', 'REST', '代理'], description: '通过受保护的本地代理发送 HTTP 请求。', icon: Globe2, component: HttpTool },
]
export const findTool = (slug: string) => tools.find((tool) => tool.slug === slug)
export function searchTools(query: string) { const normalized = query.trim().toLocaleLowerCase('zh-CN'); if (!normalized) return tools; return tools.filter((tool) => [tool.name, tool.category, tool.description, ...tool.keywords].join(' ').toLocaleLowerCase('zh-CN').includes(normalized)) }
export function groupToolsByCategory(items: ToolDefinition[]) { const groups = new Map<ToolCategory, ToolDefinition[]>(); for (const item of items) groups.set(item.category, [...(groups.get(item.category) ?? []), item]); return groups }

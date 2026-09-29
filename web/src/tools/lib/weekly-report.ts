import type { Result } from './result'

export interface WeeklyItem {
  product: string
  version: string
  releaseDate: string
  module: string
  task: string
  person: string
  costPlan: string
  costTotal: string
  process: string
  status: string
  effect: string
  remark: string
}

export const productMap = {
  YING: '慧盈业财平台',
  CRM: '慧算账运营平台',
  SQAP: '服务质量分析平台',
  IDP: '慧眼数据平台',
  HSZ: '慧算账官网',
  CP: '云手机',
  SATP: '慧算账财税业务平台',
} as const

const fields: Array<{ key: keyof WeeklyItem; label: string; required: boolean }> = [
  { key: 'product', label: '产品', required: true },
  { key: 'version', label: '版本', required: true },
  { key: 'releaseDate', label: '发布日期', required: true },
  { key: 'module', label: '涉及模块', required: true },
  { key: 'task', label: '任务名称', required: true },
  { key: 'person', label: '负责人', required: true },
  { key: 'costPlan', label: '预计消耗时间', required: true },
  { key: 'costTotal', label: '已投入时间', required: true },
  { key: 'process', label: '进度', required: true },
  { key: 'status', label: '状态', required: true },
  { key: 'effect', label: '预计产出', required: true },
  { key: 'remark', label: '备注', required: false },
]

export function parseWeeklyRows(input: string): Result<WeeklyItem[]> {
  const rows = input.split(/\r?\n/).map((text, index) => ({ text, lineNumber: index + 1 })).filter((row) => row.text.trim())
  if (!rows.length) return { ok: false, error: '请粘贴周报表格数据' }
  const values: WeeklyItem[] = []
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const { text, lineNumber } = rows[rowIndex]
    const cells = text.split('\t').map((cell) => cell.trim())
    const missing = fields.filter((field, index) => field.required && !cells[index]).map((field) => field.label)
    if (missing.length) return { ok: false, error: `第 ${lineNumber} 行缺少必填字段：${missing.join('、')}` }
    for (const [index, label] of [[6, '预计消耗时间'], [7, '已投入时间']] as const) {
      if (!/^\d+(?:\.\d+)?$/.test(cells[index])) return { ok: false, error: `第 ${lineNumber} 行“${label}”必须是非负数字` }
    }
    if (!/^\d+(?:\.\d+)?%?$/.test(cells[8]) || Number(cells[8].replace('%', '')) > 100) return { ok: false, error: `第 ${lineNumber} 行“进度”必须是 0 到 100 的百分比` }
    values.push(Object.fromEntries(fields.map((field, index) => [field.key, cells[index] ?? ''])) as unknown as WeeklyItem)
  }
  return { ok: true, value: values }
}

function sum(list: WeeklyItem[], key: 'costPlan' | 'costTotal') {
  return list.reduce((total, item) => total + (Number(item[key]) || 0), 0)
}

function primaryStatus(list: WeeklyItem[]) {
  const counts = new Map<string, number>()
  for (const item of list) counts.set(item.status, (counts.get(item.status) ?? 0) + 1)
  return [...counts].reduce((best, current) => current[1] > best[1] ? current : best, ['', 0] as [string, number])[0]
}

function averageProcess(list: WeeklyItem[]) {
  if (!list.length) return '0%'
  const total = list.reduce((value, item) => value + (Number.parseInt(item.process.replace('%', ''), 10) || 0), 0)
  return `${Math.round(total / list.length)}%`
}

function formatDate(value: string) {
  const match = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  return match ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}` : value
}

function versionSummary(items: WeeklyItem[]) {
  const modules = [...new Set(items.map((item) => item.module))].join('、')
  return `${modules}（${primaryStatus(items)}（${averageProcess(items)}），预计 ${sum(items, 'costPlan')} 人天，已投入 ${sum(items, 'costTotal')} 人天）`
}

function weeklySummary(list: WeeklyItem[], selectedProducts: string[]) {
  let result = '本周总结：'
  const products = new Map<string, WeeklyItem[]>()
  for (const item of [...list].sort((left, right) => left.version.localeCompare(right.version))) {
    if (!selectedProducts.includes(item.product)) continue
    products.set(item.product, [...(products.get(item.product) ?? []), item])
  }
  for (const [product, productItems] of products) {
    result += `\n${product}（${productMap[product as keyof typeof productMap] ?? product}）：\n`
    const versions = new Map<string, WeeklyItem[]>()
    for (const item of productItems) versions.set(item.version, [...(versions.get(item.version) ?? []), item])
    for (const [version, versionItems] of versions) {
      result += `- v${version}（${formatDate(versionItems[0].releaseDate)}）：${versionSummary(versionItems)}\n`
      for (const item of versionItems) {
        result += `  - ${item.task}：${item.status}（${item.process}），ROI：预计 ${item.costPlan} 人天，已投入 ${item.costTotal} 人天，预计产出：${item.effect}`
        result += item.remark ? ` // ${item.remark}\n` : '\n'
      }
    }
  }
  return `${result}\n下周计划：\n- 以上未完成任务持续进行`
}

export function generateWeeklyReport(list: WeeklyItem[], selectedProducts: string[], selectedMembers: string[]): Result<string> {
  if (!selectedProducts.length) return { ok: false, error: '请选择产品项目' }
  if (!selectedMembers.length) return { ok: false, error: '请添加并选择团队成员' }
  const unmatched = selectedMembers.filter((member) => !list.some((item) => item.person === member))
  if (unmatched.length) return { ok: false, error: `未找到负责人完全匹配的成员：${unmatched.join('、')}` }
  let result = ''
  const selectedRows = list.filter((item) => selectedMembers.includes(item.person))
  if (selectedMembers.length > 1) result += `----------\n业财前端部：\n${weeklySummary(selectedRows, selectedProducts)}\n`
  for (const member of selectedMembers) {
    result += `\n----------\n${member}：\n${weeklySummary(list.filter((item) => item.person === member), selectedProducts)}\n`
  }
  return { ok: true, value: result }
}

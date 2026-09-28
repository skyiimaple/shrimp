import { CronExpressionParser } from 'cron-parser'
import type { Result } from './result'
function describeField(value: string, label: string) {
  if (value === '*') return `每${label}`
  if (value.includes('/')) return `${label}按 ${value} 步进`
  if (value.includes(',')) return `${label}为 ${value} 中任一值`
  if (value.includes('-')) return `${label}在 ${value} 范围内`
  return `${label}为 ${value}`
}
export function analyzeCron(expression: string, from = new Date(), count = 5): Result<{ description: string; nextRuns: string[] }> {
  const fields = expression.trim().split(/\s+/)
  if (fields.length !== 5) return { ok: false, error: '标准 Cron 表达式必须恰好包含 5 段' }
  const limits = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]] as const
  const labels = ['分钟', '小时', '日期', '月份', '星期']
  for (let index = 0; index < fields.length; index += 1) {
    if (/^\d+$/.test(fields[index])) {
      const value = Number(fields[index]); const [minimum, maximum] = limits[index]
      if (value < minimum || value > maximum) return { ok: false, error: `${labels[index]}字段超出允许范围 ${minimum}–${maximum}` }
    }
  }
  try {
    const interval = CronExpressionParser.parse(expression, { currentDate: from })
    const nextRuns = Array.from({ length: count }, () => interval.next().toDate().toISOString())
    return { ok: true, value: { description: fields.map((field, index) => describeField(field, labels[index])).join('，'), nextRuns } }
  } catch { return { ok: false, error: 'Cron 表达式无效，请检查各字段范围与格式' } }
}

import type { Result } from './result'
export interface TimeResult { iso: string; local: string; seconds: number; milliseconds: number }
function fromDate(date: Date): Result<TimeResult> {
  if (Number.isNaN(date.getTime())) return { ok: false, error: '请输入有效的日期或时间戳' }
  const milliseconds = date.getTime()
  return { ok: true, value: { iso: date.toISOString(), local: date.toLocaleString('zh-CN', { hour12: false }), seconds: Math.floor(milliseconds / 1000), milliseconds } }
}
export function parseTimestamp(input: string, unit: 'seconds' | 'milliseconds'): Result<TimeResult> {
  if (!/^-?\d+$/.test(input.trim())) return { ok: false, error: '时间戳只能包含整数' }
  const value = Number(input)
  if (!Number.isSafeInteger(value)) return { ok: false, error: '时间戳超出安全范围' }
  return fromDate(new Date(unit === 'seconds' ? value * 1000 : value))
}
export function fromIso(input: string) {
  const calendar = input.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (calendar) {
    const [, year, month, day] = calendar
    const probe = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
    if (probe.getUTCFullYear() !== Number(year) || probe.getUTCMonth() + 1 !== Number(month) || probe.getUTCDate() !== Number(day)) return { ok: false, error: '请输入有效的日期或时间戳' } as const
  }
  return fromDate(new Date(input))
}

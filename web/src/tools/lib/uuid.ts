import type { Result } from './result';
export function generateUuidBatch(count: number): Result<string[]> {
  if (!Number.isInteger(count) || count < 1 || count > 100)
    return { ok: false, error: '生成数量必须在 1 到 100 之间' };
  return { ok: true, value: Array.from({ length: count }, () => crypto.randomUUID()) };
}

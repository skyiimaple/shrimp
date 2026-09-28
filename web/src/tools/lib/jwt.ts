import { decodeBase64Utf8 } from './base64'
import type { Result } from './result'

function decodePart(part: string): Result<unknown> {
  const standard = part.replace(/-/g, '+').replace(/_/g, '/')
  const padded = standard + '='.repeat((4 - standard.length % 4) % 4)
  const decoded = decodeBase64Utf8(padded)
  if (!decoded.ok) return decoded
  try { return { ok: true, value: JSON.parse(decoded.value) } }
  catch { return { ok: false, error: 'JWT 内容不是有效 JSON' } }
}
export function decodeJwt(input: string): Result<{ header: unknown; payload: unknown }> {
  const parts = input.trim().split('.')
  if (parts.length !== 3 || !parts[0] || !parts[1]) return { ok: false, error: 'JWT 必须包含 Header、Payload 和签名三段' }
  const header = decodePart(parts[0]); if (!header.ok) return header
  const payload = decodePart(parts[1]); if (!payload.ok) return payload
  return { ok: true, value: { header: header.value, payload: payload.value } }
}

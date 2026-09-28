import type { Result } from './result'

export function encodeBase64Utf8(input: string) {
  const bytes = new TextEncoder().encode(input)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}
export function decodeBase64Utf8(input: string): Result<string> {
  const normalized = input.trim()
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(normalized)) return { ok: false, error: 'Base64 内容格式无效' }
  try {
    const binary = atob(normalized)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return { ok: true, value: new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
  } catch { return { ok: false, error: 'Base64 内容不是有效的 UTF-8 文本' } }
}

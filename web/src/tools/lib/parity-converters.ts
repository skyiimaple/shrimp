const crockford = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function generateUlid(now = Date.now()) {
  if (!Number.isSafeInteger(now) || now < 0 || now > 0xffffffffffff) {
    throw new Error('时间超出 ULID 支持范围');
  }
  const random = crypto.getRandomValues(new Uint8Array(10));
  let randomBits = 0n;
  for (const byte of random) randomBits = (randomBits << 8n) | BigInt(byte);
  let value = (BigInt(now) << 80n) | randomBits;
  let output = '';
  for (let index = 0; index < 26; index++) {
    output = crockford[Number(value & 31n)] + output;
    value >>= 5n;
  }
  return output;
}

export function randomPort() {
  const size = 65535 - 49152 + 1;
  const range = 0x100000000;
  const limit = Math.floor(range / size) * size;
  const sample = new Uint32Array(1);
  do {
    crypto.getRandomValues(sample);
  } while (sample[0] >= limit);
  return 49152 + (sample[0] % size);
}

export function textToBinary(input: string) {
  return [...new TextEncoder().encode(input)]
    .map((byte) => byte.toString(2).padStart(8, '0'))
    .join(' ');
}

export function binaryToText(input: string) {
  const bits = input.trim().split(/\s+/);
  if (!input.trim()) return '';
  if (bits.some((part) => !/^[01]{8}$/.test(part))) {
    throw new Error('请输入以空格分隔的 8 位二进制字节');
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(
      Uint8Array.from(bits, (part) => Number.parseInt(part, 2)),
    );
  } catch {
    throw new Error('输入不是有效的 UTF-8 字节序列');
  }
}

export function textToUnicode(input: string) {
  return [...input]
    .map((character) => `U+${character.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`)
    .join(' ');
}

export function unicodeToText(input: string) {
  if (!input.trim()) return '';
  return input.trim().split(/\s+/).map((part) => {
    if (!/^U\+[\dA-Fa-f]{4,6}$/.test(part)) throw new Error('请输入 U+XXXX 格式的 Unicode 码点');
    const codePoint = Number.parseInt(part.slice(2), 16);
    if (codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
      throw new Error('Unicode 码点无效');
    }
    return String.fromCodePoint(codePoint);
  }).join('');
}

export function slugify(input: string) {
  return input
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');
}

export type TemperatureScale = 'C' | 'F' | 'K';

export function convertTemperature(value: number, from: TemperatureScale, to: TemperatureScale) {
  if (!Number.isFinite(value)) throw new Error('请输入有效温度');
  const kelvin = from === 'K' ? value : from === 'C' ? value + 273.15 : (value - 32) * 5 / 9 + 273.15;
  if (kelvin < -1e-9) throw new Error('温度不能低于绝对零度');
  const result = to === 'K' ? kelvin : to === 'C' ? kelvin - 273.15 : (kelvin - 273.15) * 9 / 5 + 32;
  return Number(result.toFixed(10));
}

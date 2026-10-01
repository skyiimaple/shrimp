const prefix = 'shrimp:aes-gcm:v1:';
const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array) {
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function deriveAesKey(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: Uint8Array.from(salt), iterations: 210_000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptText(plaintext: string, password: string) {
  if (!password) throw new Error('请输入口令');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(password, salt);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext)),
  );
  const packed = new Uint8Array(salt.length + iv.length + encrypted.length);
  packed.set(salt);
  packed.set(iv, salt.length);
  packed.set(encrypted, salt.length + iv.length);
  return prefix + toBase64(packed);
}

export async function decryptText(ciphertext: string, password: string) {
  if (!password) throw new Error('请输入口令');
  if (!ciphertext.startsWith(prefix)) throw new Error('密文格式无效');
  try {
    const packed = fromBase64(ciphertext.slice(prefix.length));
    if (packed.length < 45) throw new Error('short ciphertext');
    const key = await deriveAesKey(password, packed.slice(0, 16));
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: packed.slice(16, 28) },
      key,
      packed.slice(28),
    );
    return new TextDecoder('utf-8', { fatal: true }).decode(plain);
  } catch {
    throw new Error('解密失败：口令错误或密文已损坏');
  }
}

const base32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function encodeBase32(bytes: Uint8Array) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += base32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits) output += base32[(value << (5 - bits)) & 31];
  return output;
}

function decodeBase32(input: string) {
  const normalized = input.toUpperCase().replace(/[\s-]/g, '').replace(/=+$/, '');
  if (!normalized || /[^A-Z2-7]/.test(normalized)) throw new Error('密钥须为 Base32 格式');
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const character of normalized) {
    value = (value << 5) | base32.indexOf(character);
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  if (!output.length || (bits && (value & ((1 << bits) - 1)) !== 0)) {
    throw new Error('密钥须为 Base32 格式');
  }
  return new Uint8Array(output);
}

export function generateTotpSecret() {
  return encodeBase32(crypto.getRandomValues(new Uint8Array(20)));
}

export async function totp(secret: string, unixSeconds = Math.floor(Date.now() / 1000), digits = 6) {
  if (!Number.isSafeInteger(unixSeconds) || unixSeconds < 0) throw new Error('时间无效');
  if (!Number.isInteger(digits) || digits < 6 || digits > 8) throw new Error('位数须为 6 到 8');
  const key = await crypto.subtle.importKey(
    'raw',
    decodeBase32(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  let counter = BigInt(Math.floor(unixSeconds / 30));
  const message = new Uint8Array(8);
  for (let index = 7; index >= 0; index--) {
    message[index] = Number(counter & 255n);
    counter >>= 8n;
  }
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, message));
  const offset = digest.at(-1)! & 15;
  const value =
    (((digest[offset] & 127) << 24) |
      (digest[offset + 1] << 16) |
      (digest[offset + 2] << 8) |
      digest[offset + 3]) %
    10 ** digits;
  return String(value).padStart(digits, '0');
}

function toPem(buffer: ArrayBuffer, label: string) {
  const base64 = toBase64(new Uint8Array(buffer));
  const lines = base64.match(/.{1,64}/g)?.join('\n') ?? '';
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----`;
}

export async function generateRsaKeyPair() {
  const pair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt'],
  );
  return {
    publicKey: toPem(await crypto.subtle.exportKey('spki', pair.publicKey), 'PUBLIC KEY'),
    privateKey: toPem(await crypto.subtle.exportKey('pkcs8', pair.privateKey), 'PRIVATE KEY'),
  };
}

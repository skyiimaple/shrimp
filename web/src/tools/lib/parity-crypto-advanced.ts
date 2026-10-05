import { generateMnemonic, mnemonicToSeed, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { compare, hash } from 'bcryptjs';

const MIN_BCRYPT_COST = 4;
const MAX_BCRYPT_COST = 12;
const bcryptPattern = /^\$2[aby]\$(\d{2})\$[./A-Za-z0-9]{53}$/;

export async function generateBcryptHash(password: string, cost = 10): Promise<string> {
  if (!Number.isInteger(cost) || cost < MIN_BCRYPT_COST || cost > MAX_BCRYPT_COST) {
    throw new Error('Bcrypt 成本须为 4 到 12');
  }
  if (!password) throw new Error('请输入密码');
  if (new TextEncoder().encode(password).length > 72) throw new Error('密码不能超过 72 字节');
  return hash(password, cost);
}

export async function verifyBcryptHash(password: string, encodedHash: string): Promise<boolean> {
  const match = bcryptPattern.exec(encodedHash.trim());
  if (!match) throw new Error('Bcrypt 哈希格式无效');
  const cost = Number(match[1]);
  if (cost < MIN_BCRYPT_COST || cost > MAX_BCRYPT_COST) {
    throw new Error('Bcrypt 成本须为 4 到 12');
  }
  if (new TextEncoder().encode(password).length > 72) throw new Error('密码不能超过 72 字节');
  return compare(password, encodedHash.trim());
}

export function generateMnemonicPhrase(wordCount: 12 | 24 = 12): string {
  if (wordCount !== 12 && wordCount !== 24) throw new Error('仅支持 12 或 24 个单词');
  return generateMnemonic(wordlist, wordCount === 12 ? 128 : 256);
}

export function validateMnemonicPhrase(phrase: string): boolean {
  return validateMnemonic(phrase.trim().replace(/\s+/g, ' '), wordlist);
}

export async function deriveMnemonicSeed(phrase: string, passphrase = ''): Promise<string> {
  const normalized = phrase.trim().replace(/\s+/g, ' ');
  if (!validateMnemonic(normalized, wordlist)) throw new Error('助记词无效');
  const seed = await mnemonicToSeed(normalized, passphrase);
  return Array.from(seed, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

import { failure, type Result } from './result';

export interface PasswordOptions {
  length: number;
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
}

const groups = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{}',
};

function secureIndex(size: number): number {
  const range = 0x100000000;
  const limit = Math.floor(range / size) * size;
  const sample = new Uint32Array(1);
  do {
    crypto.getRandomValues(sample);
  } while (sample[0] >= limit);
  return sample[0] % size;
}

export function generatePassword(options: PasswordOptions): Result<string> {
  const selected = (Object.keys(groups) as Array<keyof typeof groups>)
    .filter((key) => options[key])
    .map((key) => groups[key]);
  if (!selected.length) return failure('请至少选择一种字符类别');
  if (!Number.isInteger(options.length) || options.length < 4 || options.length > 128)
    return failure('密码长度须为 4 到 128');
  if (options.length < selected.length) return failure('密码长度不能少于所选字符类别数');
  if (!globalThis.crypto?.getRandomValues) return failure('当前浏览器不支持安全随机源');
  const all = selected.join('');
  const chars = selected.map((group) => group[secureIndex(group.length)]);
  while (chars.length < options.length) chars.push(all[secureIndex(all.length)]);
  for (let index = chars.length - 1; index > 0; index--) {
    const other = secureIndex(index + 1);
    [chars[index], chars[other]] = [chars[other], chars[index]];
  }
  return { ok: true, value: chars.join('') };
}

export function analyzePassword(input: string): { level: '弱' | '一般' | '强'; feedback: string } {
  if (!input) return { level: '弱', feedback: '输入或生成密码后查看强度。' };
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((pattern) =>
    pattern.test(input),
  ).length;
  const common = /password|123456|qwerty|admin|abcdef/i.test(input);
  if (common) return { level: '弱', feedback: '包含常见密码片段，请换用随机密码。' };
  if (input.length >= 16 && classes >= 3)
    return { level: '强', feedback: '长度和字符种类较充分；仍请勿重复用于多个账户。' };
  if (input.length >= 10 && classes >= 2)
    return { level: '一般', feedback: '建议增加长度并混合更多字符类别。' };
  return { level: '弱', feedback: '建议使用至少 16 位、包含多种字符的随机密码。' };
}

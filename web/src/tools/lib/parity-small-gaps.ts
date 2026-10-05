const FONT: Record<string, string[]> = {
  A: [' # ', '# #', '###', '# #', '# #'],
  B: ['## ', '# #', '## ', '# #', '## '],
  C: [' ##', '#  ', '#  ', '#  ', ' ##'],
  D: ['## ', '# #', '# #', '# #', '## '],
  E: ['###', '#  ', '## ', '#  ', '###'],
  F: ['###', '#  ', '## ', '#  ', '#  '],
  G: [' ##', '#  ', '# #', '# #', ' ##'],
  H: ['# #', '# #', '###', '# #', '# #'],
  I: ['###', ' # ', ' # ', ' # ', '###'],
  J: ['  #', '  #', '  #', '# #', ' # '],
  K: ['# #', '## ', '#  ', '## ', '# #'],
  L: ['#  ', '#  ', '#  ', '#  ', '###'],
  M: ['# #', '###', '###', '# #', '# #'],
  N: ['# #', '###', '###', '###', '# #'],
  O: [' # ', '# #', '# #', '# #', ' # '],
  P: ['## ', '# #', '## ', '#  ', '#  '],
  Q: [' # ', '# #', '# #', ' ##', '  #'],
  R: ['## ', '# #', '## ', '## ', '# #'],
  S: [' ##', '#  ', ' # ', '  #', '## '],
  T: ['###', ' # ', ' # ', ' # ', ' # '],
  U: ['# #', '# #', '# #', '# #', '###'],
  V: ['# #', '# #', '# #', '# #', ' # '],
  W: ['# #', '# #', '###', '###', '# #'],
  X: ['# #', '# #', ' # ', '# #', '# #'],
  Y: ['# #', '# #', ' # ', ' # ', ' # '],
  Z: ['###', '  #', ' # ', '#  ', '###'],
  '0': ['###', '# #', '# #', '# #', '###'],
  '1': [' # ', '## ', ' # ', ' # ', '###'],
  '2': ['## ', '  #', ' # ', '#  ', '###'],
  '3': ['## ', '  #', ' # ', '  #', '## '],
  '4': ['# #', '# #', '###', '  #', '  #'],
  '5': ['###', '#  ', '## ', '  #', '## '],
  '6': [' ##', '#  ', '## ', '# #', ' # '],
  '7': ['###', '  #', ' # ', ' # ', ' # '],
  '8': [' # ', '# #', ' # ', '# #', ' # '],
  '9': [' # ', '# #', ' ##', '  #', '## '],
  ' ': ['   ', '   ', '   ', '   ', '   '],
};

export function generateToken(length: number, alphabet: string): string {
  const chars = Array.from(alphabet);
  if (!Number.isInteger(length) || length < 1 || length > 4096)
    throw new Error('令牌长度须为 1 到 4096');
  if (chars.length < 2 || chars.length > 256 || new Set(chars).size !== chars.length)
    throw new Error('字符集须包含 2 到 256 个不重复字符');
  if (!globalThis.crypto?.getRandomValues) throw new Error('当前浏览器不支持安全随机源');
  const limit = Math.floor(256 / chars.length) * chars.length;
  const sample = new Uint8Array(1);
  let output = '';
  while (Array.from(output).length < length) {
    crypto.getRandomValues(sample);
    if (sample[0] < limit) output += chars[sample[0] % chars.length];
  }
  return output;
}

export function analyzePasswordStrength(password: string): {
  level: '弱' | '一般' | '强';
  feedback: string;
} {
  if (!password) return { level: '弱', feedback: '输入密码后查看估算结果。' };
  if (/password|123456|qwerty|admin|abcdef/i.test(password))
    return { level: '弱', feedback: '包含常见密码片段，建议更换。' };
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((pattern) =>
    pattern.test(password),
  ).length;
  if (password.length >= 20 || (password.length >= 16 && classes >= 3))
    return { level: '强', feedback: '长度较充分；请避免重复使用。' };
  if (password.length >= 10 && classes >= 2)
    return { level: '一般', feedback: '建议增加长度，优先使用随机密码。' };
  return { level: '弱', feedback: '建议使用更长的随机密码。' };
}

export function drawAsciiText(input: string): string {
  if (!input) return '';
  const characters = Array.from(input.toUpperCase());
  const unsupported = characters.find((character) => !FONT[character]);
  if (unsupported) throw new Error(`不支持字符：${unsupported}；仅支持英文字母、数字和空格`);
  return Array.from({ length: 5 }, (_, row) =>
    characters.map((character) => FONT[character][row]).join(' '),
  ).join('\n');
}

export function encodeHtmlEntities(input: string) {
  return input.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

const namedEntities: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
};

export function decodeHtmlEntities(input: string) {
  return input.replace(/&(#(?:[xX][\da-fA-F]+|\d+)|[a-zA-Z]+);/g, (entity, reference: string) => {
    if (!reference.startsWith('#')) return namedEntities[reference] ?? entity;
    const hex = reference[1]?.toLowerCase() === 'x';
    const codePoint = Number.parseInt(reference.slice(hex ? 2 : 1), hex ? 16 : 10);
    return codePoint > 0 && codePoint <= 0x10ffff && !(codePoint >= 0xd800 && codePoint <= 0xdfff)
      ? String.fromCodePoint(codePoint)
      : entity;
  });
}

export type TextDiffLine = { kind: 'same' | 'added' | 'removed'; value: string };

export function diffTextLines(before: string, after: string): TextDiffLine[] {
  const left = before.split(/\r?\n/);
  const right = after.split(/\r?\n/);
  if (left.length * right.length > 250_000) {
    throw new Error('文本过长，请将两侧内容各控制在约 500 行以内');
  }
  const lengths = Array.from({ length: left.length + 1 }, () => new Uint16Array(right.length + 1));
  for (let i = left.length - 1; i >= 0; i--) {
    for (let j = right.length - 1; j >= 0; j--) {
      lengths[i][j] =
        left[i] === right[j]
          ? lengths[i + 1][j + 1] + 1
          : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }
  const output: TextDiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) {
      output.push({ kind: 'same', value: left[i++] });
      j++;
    } else if (j < right.length && (i === left.length || lengths[i][j + 1] > lengths[i + 1][j])) {
      output.push({ kind: 'added', value: right[j++] });
    } else {
      output.push({ kind: 'removed', value: left[i++] });
    }
  }
  return output;
}

export async function hmacHex(
  key: string,
  message: string,
  algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512',
) {
  if (!key) throw new Error('请输入密钥');
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: algorithm },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function basicAuthHeader(username: string, password: string) {
  if (username.includes(':')) throw new Error('用户名不能包含冒号');
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  return `Basic ${btoa([...bytes].map((byte) => String.fromCharCode(byte)).join(''))}`;
}

export function chmodInfo(input: string) {
  const normalized = input.startsWith('0') && input.length === 4 ? input.slice(1) : input;
  if (!/^[0-7]{3}$/.test(normalized)) throw new Error('请输入三位八进制权限，例如 755');
  const symbolic = [...normalized]
    .map((digit) => {
      const value = Number(digit);
      return `${value & 4 ? 'r' : '-'}${value & 2 ? 'w' : '-'}${value & 1 ? 'x' : '-'}`;
    })
    .join('');
  return { octal: normalized, symbolic };
}

const romanTokens: [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

export function integerToRoman(input: number) {
  if (!Number.isInteger(input) || input < 1 || input > 3999) {
    throw new Error('请输入 1 到 3999 之间的整数');
  }
  let remaining = input;
  let output = '';
  for (const [value, token] of romanTokens) {
    while (remaining >= value) {
      output += token;
      remaining -= value;
    }
  }
  return output;
}

export function romanToInteger(input: string) {
  const normalized = input.trim().toUpperCase();
  let value = 0;
  let rest = normalized;
  for (const [amount, token] of romanTokens) {
    while (rest.startsWith(token)) {
      value += amount;
      rest = rest.slice(token.length);
    }
  }
  if (!value || integerToRoman(value) !== normalized) throw new Error('请输入规范的罗马数字');
  return value;
}

export function textStats(input: string) {
  return {
    characters: [...input].length,
    words: input.match(/[\p{L}\p{N}]+/gu)?.length ?? 0,
    lines: input ? input.split(/\r?\n/).length : 0,
    bytes: new TextEncoder().encode(input).length,
  };
}

export function numeronym(input: string) {
  const characters = [...input.trim()];
  return characters.length > 2
    ? `${characters[0]}${characters.length - 2}${characters.at(-1)}`
    : characters.join('');
}

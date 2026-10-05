export interface RegexCheatsheetEntry {
  syntax: string;
  name: string;
  description: string;
}

const loremParagraphs = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  'Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris.',
];

export function generateLoremIpsum(paragraphCount: number): string {
  if (!Number.isInteger(paragraphCount) || paragraphCount < 1 || paragraphCount > 20) {
    throw new Error('段落数量须为 1 至 20 的整数');
  }
  return Array.from(
    { length: paragraphCount },
    (_, index) => loremParagraphs[index % loremParagraphs.length],
  ).join('\n\n');
}

export function maskText(input: string, keepStart: number, keepEnd: number): string {
  if (
    !Number.isSafeInteger(keepStart) ||
    keepStart < 0 ||
    !Number.isSafeInteger(keepEnd) ||
    keepEnd < 0
  ) {
    throw new Error('保留字符数量须为非负整数');
  }
  const characters = Array.from(input);
  const start = Math.min(keepStart, characters.length);
  const end = Math.min(keepEnd, characters.length - start);
  return (
    characters.slice(0, start).join('') +
    '*'.repeat(characters.length - start - end) +
    characters.slice(characters.length - end).join('')
  );
}

export function normalizeEmail(input: string): string {
  const trimmed = input.trim();
  const at = trimmed.indexOf('@');
  if (at < 1 || at === trimmed.length - 1 || trimmed.indexOf('@', at + 1) !== -1) return trimmed;
  return `${trimmed.slice(0, at)}@${trimmed.slice(at + 1).toLowerCase()}`;
}

const regexEntries: RegexCheatsheetEntry[] = [
  { syntax: '.', name: '任意字符', description: '匹配除换行外的单个字符；s 标志下也匹配换行。' },
  { syntax: '^', name: '开头锚点', description: '匹配输入开头；m 标志下也匹配每行开头。' },
  { syntax: '$', name: '结尾锚点', description: '匹配输入结尾；m 标志下也匹配每行结尾。' },
  { syntax: '\\d', name: '数字字符', description: '匹配 ASCII 数字，等价于 [0-9]。' },
  { syntax: '\\w', name: '单词字符', description: '匹配 ASCII 字母、数字或下划线。' },
  { syntax: '\\s', name: '空白字符', description: '匹配空格、制表符或换行等空白字符。' },
  { syntax: '\\b', name: '单词边界', description: '匹配单词字符与非单词字符之间的位置。' },
  { syntax: '[abc]', name: '字符类', description: '匹配方括号内的一个字符。' },
  { syntax: '[^abc]', name: '否定字符类', description: '匹配方括号内字符以外的一个字符。' },
  { syntax: '*', name: '零次或多次量词', description: '前一项出现零次或多次。' },
  { syntax: '+', name: '一次或多次量词', description: '前一项出现一次或多次。' },
  { syntax: '?', name: '可选量词', description: '前一项出现零次或一次；跟在量词后可改为非贪婪。' },
  { syntax: '{n,m}', name: '范围量词', description: '前一项出现至少 n 次、至多 m 次。' },
  { syntax: '(abc)', name: '捕获组', description: '匹配并捕获组内内容。' },
  { syntax: '(?:abc)', name: '非捕获组', description: '分组但不创建捕获结果。' },
  { syntax: 'a|b', name: '或', description: '匹配左侧或右侧表达式。' },
  { syntax: '(?=...)', name: '正向前瞻', description: '要求后续内容匹配，但不消耗字符。' },
  { syntax: '(?!...)', name: '负向前瞻', description: '要求后续内容不匹配。' },
  { syntax: '(?<=...)', name: '正向后顾', description: '要求前方内容匹配，但不消耗字符。' },
  { syntax: '\\p{L}', name: 'Unicode 属性', description: 'u 或 v 标志下匹配 Unicode 字母。' },
  {
    syntax: '/.../gi',
    name: '常用标志',
    description: 'g 全局、i 忽略大小写；其他常见标志有 m、s、u、v、y、d。',
  },
];

export function searchRegexCheatsheet(query: string): RegexCheatsheetEntry[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return regexEntries;
  return regexEntries.filter(({ syntax, name, description }) =>
    `${syntax} ${name} ${description}`.toLocaleLowerCase().includes(needle),
  );
}

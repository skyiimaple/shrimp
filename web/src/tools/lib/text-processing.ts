export type TextCaseMode = 'camel' | 'pascal' | 'snake' | 'kebab' | 'title' | 'upper' | 'lower';
export type ListSort = 'none' | 'asc' | 'desc';

function words(input: string): string[] {
  return input
    .trim()
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z\p{L}])(\d)/gu, '$1 $2')
    .replace(/(\d)([A-Za-z\p{L}])/gu, '$1 $2')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((word) => word.toLocaleLowerCase());
}

const capitalize = (word: string) => (word ? `${word[0].toLocaleUpperCase()}${word.slice(1)}` : '');

export function convertTextCase(input: string, mode: TextCaseMode): string {
  const parts = words(input);
  if (mode === 'upper') return parts.join(' ').toLocaleUpperCase();
  if (mode === 'lower') return parts.join(' ');
  if (mode === 'camel')
    return parts.map((word, index) => (index ? capitalize(word) : word)).join('');
  if (mode === 'pascal') return parts.map(capitalize).join('');
  if (mode === 'snake') return parts.join('_');
  if (mode === 'kebab') return parts.join('-');
  return parts.map(capitalize).join(' ');
}

export function processList(
  input: string,
  options: { deduplicate: boolean; sort: ListSort },
): {
  lines: string[];
  output: string;
  inputCount: number;
  outputCount: number;
  duplicateCount: number;
  emptyCount: number;
} {
  const source = input.split(/\r?\n/);
  const cleaned = source.map((line) => line.trim());
  const emptyCount = cleaned.filter((line) => !line).length;
  const nonEmpty = cleaned.filter(Boolean);
  const unique = [...new Set(nonEmpty)];
  const duplicateCount = nonEmpty.length - unique.length;
  const lines = options.deduplicate ? unique : [...nonEmpty];
  if (options.sort !== 'none') {
    lines.sort((left, right) => left.localeCompare(right, 'zh-CN', { numeric: true }));
    if (options.sort === 'desc') lines.reverse();
  }
  return {
    lines,
    output: lines.join('\n'),
    inputCount: source.length,
    outputCount: lines.length,
    duplicateCount,
    emptyCount,
  };
}

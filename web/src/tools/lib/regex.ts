import type { Result } from './result';
export interface RegexMatch {
  match: string;
  index: number;
  groups: string[];
}
export function advanceStringIndex(text: string, index: number, unicode: boolean) {
  if (!unicode || index + 1 >= text.length) return index + 1;
  const first = text.charCodeAt(index);
  if (first < 0xd800 || first > 0xdbff) return index + 1;
  const second = text.charCodeAt(index + 1);
  return second >= 0xdc00 && second <= 0xdfff ? index + 2 : index + 1;
}
export function runRegex(pattern: string, flags: string, text: string): Result<RegexMatch[]> {
  if ([...flags].some((flag) => !'dgimsuvy'.includes(flag)) || new Set(flags).size !== flags.length)
    return { ok: false, error: '正则 flags 包含不支持或重复的字符' };
  try {
    const regex = new RegExp(pattern, flags);
    const values: RegexMatch[] = [];
    if (!flags.includes('g')) {
      const match = regex.exec(text);
      if (match)
        values.push({
          match: match[0],
          index: match.index,
          groups: match.slice(1).map((value) => value ?? ''),
        });
    } else {
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        values.push({
          match: match[0],
          index: match.index,
          groups: match.slice(1).map((value) => value ?? ''),
        });
        if (match[0] === '')
          regex.lastIndex = advanceStringIndex(
            text,
            regex.lastIndex,
            flags.includes('u') || flags.includes('v'),
          );
      }
    }
    return { ok: true, value: values };
  } catch (error) {
    return {
      ok: false,
      error: `正则表达式无效：${error instanceof Error ? error.message : '请检查表达式'}`,
    };
  }
}

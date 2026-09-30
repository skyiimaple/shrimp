import { format } from 'sql-formatter';
import { failure, type Result } from './result';

function validateDelimiters(input: string): string | null {
  let quote = '';
  let depth = 0;
  let blockComment = false;
  let lineComment = false;
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    const next = input[index + 1];
    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index++;
      }
      continue;
    }
    if (quote) {
      if (char === quote) {
        if (next === quote) index++;
        else quote = '';
      } else if (char === '\\') index++;
      continue;
    }
    if (char === '-' && next === '-') {
      lineComment = true;
      index++;
    } else if (char === '/' && next === '*') {
      blockComment = true;
      index++;
    } else if (char === "'" || char === '"' || char === '`') quote = char;
    else if (char === '(') depth++;
    else if (char === ')') {
      depth--;
      if (depth < 0) return 'SQL 括号不匹配';
    }
  }
  if (quote) return 'SQL 引号未闭合';
  if (blockComment) return 'SQL 注释未闭合';
  if (depth) return 'SQL 括号不匹配';
  return null;
}

export function formatSql(input: string): Result<string> {
  if (!input.trim()) return failure('请输入 SQL 语句');
  const delimiterError = validateDelimiters(input);
  if (delimiterError) return failure(delimiterError);
  try {
    return {
      ok: true,
      value: format(input, { language: 'sql', tabWidth: 2, keywordCase: 'upper' }),
    };
  } catch {
    return failure('SQL 格式无效，请检查语句');
  }
}

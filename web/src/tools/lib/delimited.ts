import { failure, type Result } from './result';

export type Delimiter = ',' | '\t';

function parseRows(input: string, delimiter: Delimiter): Result<string[][]> {
  if (!input.trim()) return failure('请输入 CSV 或 TSV 内容');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let afterQuote = false;
  let atStart = true;
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        field += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
        afterQuote = true;
      } else field += char;
      continue;
    }
    if (char === '"' && atStart) {
      quoted = true;
      atStart = false;
    } else if (char === delimiter || char === '\n' || char === '\r') {
      row.push(field);
      field = '';
      atStart = true;
      afterQuote = false;
      if (char !== delimiter) {
        rows.push(row);
        row = [];
        if (char === '\r' && input[index + 1] === '\n') index++;
      }
    } else if (afterQuote || char === '"') {
      return failure('引号格式无效：引号只能包裹完整单元格');
    } else {
      field += char;
      atStart = false;
    }
  }
  if (quoted) return failure('引号未闭合');
  if (row.length || field || !/[\r\n]$/.test(input)) {
    row.push(field);
    rows.push(row);
  }
  return { ok: true, value: rows };
}

export function delimitedToJson(input: string, delimiter: Delimiter): Result<string> {
  const parsed = parseRows(input, delimiter);
  if (!parsed.ok) return parsed;
  const [header, ...rows] = parsed.value;
  if (!header?.length || header.some((name) => !name.trim())) return failure('表头不能为空');
  if (new Set(header).size !== header.length) return failure('表头不能重复');
  for (let index = 0; index < rows.length; index++)
    if (rows[index].length !== header.length) return failure(`第 ${index + 2} 行列数与表头不一致`);
  return {
    ok: true,
    value: JSON.stringify(
      rows.map((row) => Object.fromEntries(header.map((name, index) => [name, row[index]]))),
      null,
      2,
    ),
  };
}

function escapeCell(value: string, delimiter: Delimiter): string {
  return value.includes(delimiter) || /["\r\n]/.test(value)
    ? `"${value.replaceAll('"', '""')}"`
    : value;
}

export function jsonToDelimited(input: string, delimiter: Delimiter): Result<string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return failure('JSON 格式无效');
  }
  if (
    !Array.isArray(parsed) ||
    !parsed.length ||
    parsed.some((row) => !row || typeof row !== 'object' || Array.isArray(row))
  )
    return failure('请输入非空的 JSON 对象数组');
  const records = parsed as Record<string, unknown>[];
  const columns = [...new Set(records.flatMap((row) => Object.keys(row)))];
  if (!columns.length) return failure('对象至少需要一个字段');
  const lines = [columns.map((name) => escapeCell(name, delimiter)).join(delimiter)];
  for (const row of records) {
    const values: string[] = [];
    for (const column of columns) {
      const value = row[column];
      if (value !== null && value !== undefined && typeof value === 'object')
        return failure(`字段 ${column} 包含嵌套值，无法转换为单元格`);
      values.push(escapeCell(value == null ? '' : String(value), delimiter));
    }
    lines.push(values.join(delimiter));
  }
  return { ok: true, value: lines.join('\r\n') };
}

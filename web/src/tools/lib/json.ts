import type { Result } from './result';

function parse(input: string): Result<unknown> {
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch (error) {
    const detail = error instanceof Error ? error.message : '未知错误';
    const lineColumn = detail.match(/line\s+(\d+)\s+column\s+(\d+)/i);
    if (lineColumn)
      return {
        ok: false,
        error: `JSON 格式无效（第 ${lineColumn[1]} 行，第 ${lineColumn[2]} 列）`,
      };
    const position = detail.match(/position\s+(\d+)/i);
    if (position) {
      const offset = Number(position[1]);
      const before = input.slice(0, offset);
      const lines = before.split('\n');
      return {
        ok: false,
        error: `JSON 格式无效（第 ${lines.length} 行，第 ${lines.at(-1)!.length + 1} 列）`,
      };
    }
    return { ok: false, error: 'JSON 格式无效，请检查括号、引号和逗号' };
  }
}
export function formatJson(input: string, indent = 2): Result<string> {
  const parsed = parse(input);
  return parsed.ok ? { ok: true, value: JSON.stringify(parsed.value, null, indent) } : parsed;
}
export function minifyJson(input: string): Result<string> {
  const parsed = parse(input);
  return parsed.ok ? { ok: true, value: JSON.stringify(parsed.value) } : parsed;
}

import { failure, type Result } from './result';

export type JsonChange = {
  path: string;
  kind: 'added' | 'removed' | 'changed';
  before?: unknown;
  after?: unknown;
};

export type JsonPatch =
  { op: 'add' | 'replace'; path: string; value: unknown } | { op: 'remove'; path: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function pointer(path: string, key: string | number): string {
  return `${path}/${String(key).replaceAll('~', '~0').replaceAll('/', '~1')}`;
}

export function diffJson(
  leftInput: string,
  rightInput: string,
): Result<{ changes: JsonChange[]; patch: JsonPatch[] }> {
  let left: unknown;
  let right: unknown;
  try {
    left = JSON.parse(leftInput);
  } catch {
    return failure('左侧 JSON 格式无效');
  }
  try {
    right = JSON.parse(rightInput);
  } catch {
    return failure('右侧 JSON 格式无效');
  }

  const changes: JsonChange[] = [];
  const patch: JsonPatch[] = [];
  function compare(before: unknown, after: unknown, path: string): void {
    if (Array.isArray(before) && Array.isArray(after)) {
      const common = Math.min(before.length, after.length);
      for (let index = 0; index < common; index++)
        compare(before[index], after[index], pointer(path, index));
      for (let index = common; index < before.length; index++)
        changes.push({ path: pointer(path, index), kind: 'removed', before: before[index] });
      for (let index = before.length - 1; index >= common; index--)
        patch.push({ op: 'remove', path: pointer(path, index) });
      for (let index = common; index < after.length; index++) {
        const childPath = pointer(path, index);
        changes.push({ path: childPath, kind: 'added', after: after[index] });
        patch.push({ op: 'add', path: childPath, value: after[index] });
      }
      return;
    }
    if (isObject(before) && isObject(after)) {
      for (const key of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
        const childPath = pointer(path, key);
        if (!Object.hasOwn(before, key)) {
          changes.push({ path: childPath, kind: 'added', after: after[key] });
          patch.push({ op: 'add', path: childPath, value: after[key] });
        } else if (!Object.hasOwn(after, key)) {
          changes.push({ path: childPath, kind: 'removed', before: before[key] });
          patch.push({ op: 'remove', path: childPath });
        } else compare(before[key], after[key], childPath);
      }
      return;
    }
    if (!Object.is(before, after)) {
      changes.push({ path, kind: 'changed', before, after });
      patch.push({ op: 'replace', path, value: after });
    }
  }
  compare(left, right, '');
  return { ok: true, value: { changes, patch } };
}

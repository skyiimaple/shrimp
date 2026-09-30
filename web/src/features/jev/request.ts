import { failure, type Result } from '../../tools/lib/result';

export type StateMode = '文本' | 'JSON';

export interface JevRequest {
  model: 'jev-latest';
  state: string | Record<string, unknown> | unknown[];
  questions: Record<string, Record<string, unknown>>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function buildJevRequest(
  stateInput: string,
  stateMode: StateMode,
  questionsInput: string,
): Result<JevRequest> {
  let state: JevRequest['state'] = stateInput;
  if (stateMode === 'JSON') {
    try {
      const parsed: unknown = JSON.parse(stateInput);
      if (typeof parsed !== 'string' && !isRecord(parsed) && !Array.isArray(parsed)) {
        return failure('state 只能是文本、对象或数组');
      }
      state = parsed;
    } catch {
      return failure('state JSON 格式无效');
    }
  }
  if (typeof state === 'string' && !state.trim()) return failure('请输入 state 内容');
  let questions: unknown;
  try {
    questions = JSON.parse(questionsInput);
  } catch {
    return failure('问题 JSON 格式无效');
  }
  if (!isRecord(questions) || !Object.keys(questions).length) return failure('请至少填写一个问题');
  for (const [id, question] of Object.entries(questions)) {
    if (!id.trim() || !isRecord(question)) return failure(`问题 ${id || '（空名称）'} 格式无效`);
    const { type, instructions, criteria } = question;
    if (!['noul', 'choice', 'score'].includes(String(type)))
      return failure(`问题 ${id} 的类型须为 noul、choice 或 score`);
    if (typeof instructions !== 'string' && !isRecord(instructions) && !Array.isArray(instructions))
      return failure(`问题 ${id} 缺少 instructions`);
    if (typeof instructions === 'string' && !instructions.trim())
      return failure(`问题 ${id} 缺少 instructions`);
    if (
      type === 'choice' &&
      (!isRecord(criteria) ||
        Object.keys(criteria).length < 2 ||
        Object.keys(criteria).length > 255)
    )
      return failure(`问题 ${id} 的 choice 至少需要两个选项，最多 255 个`);
    if (
      type === 'score' &&
      (!Array.isArray(criteria) || criteria.length < 2 || criteria.length > 10)
    )
      return failure(`问题 ${id} 的 score 需要 2 到 10 个等级`);
  }
  return {
    ok: true,
    value: { model: 'jev-latest', state, questions: questions as JevRequest['questions'] },
  };
}

import { useState } from 'react';
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Input,
  SecondaryButton,
  OptionSelect,
  Textarea,
} from '../../components/ui';
import { ToolResult } from '../../tools/components/tool-panel-shared';
import { evaluateJev, type JevAnswer, type JevResponse } from './client';
import { buildJevRequest, type StateMode } from './request';
import { clearJevApiKey, readJevApiKey, writeJevApiKey } from './storage';

const initialState = '客户说：支付集成已连续三天失败，请尽快协助。';
const initialQuestions = JSON.stringify(
  {
    urgent: { type: 'noul', instructions: '这条消息是否表达了紧迫性？' },
  },
  null,
  2,
);

const examples: Record<'noul' | 'choice' | 'score', Record<string, unknown>> = {
  noul: { type: 'noul', instructions: '这条消息是否表达了紧迫性？' },
  choice: {
    type: 'choice',
    instructions: '应该由哪个团队处理？',
    criteria: { billing: '付款或订阅问题', technical: '技术故障或集成问题', sales: '销售咨询' },
  },
  score: {
    type: 'score',
    instructions: '客户的挫败程度如何？',
    criteria: ['平静陈述事实', '有些不满', '非常愤怒'],
  },
};

type QuestionType = 'noul' | 'choice' | 'score';
type FormQuestion = {
  id: string;
  type: QuestionType;
  instructions: string;
  criteria?: string[] | Record<string, string>;
};

function formQuestionsFromJson(input: string): FormQuestion[] | null {
  try {
    const parsed: unknown = JSON.parse(input);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const questions = Object.entries(parsed);
    if (!questions.length) return null;
    return questions.map(([id, value]) => {
      if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('unsupported');
      const question = value as Record<string, unknown>;
      if (
        !['noul', 'choice', 'score'].includes(String(question.type)) ||
        typeof question.instructions !== 'string'
      )
        throw new Error('unsupported');
      if (Object.keys(question).some((key) => !['type', 'instructions', 'criteria'].includes(key)))
        throw new Error('unsupported');
      if (question.type === 'noul' && 'criteria' in question) throw new Error('unsupported');
      if (
        question.type === 'choice' &&
        (!question.criteria ||
          typeof question.criteria !== 'object' ||
          Array.isArray(question.criteria) ||
          Object.values(question.criteria).some(
            (item) => item !== null && typeof item !== 'string',
          ))
      )
        throw new Error('unsupported');
      if (
        question.type === 'score' &&
        (!Array.isArray(question.criteria) ||
          question.criteria.some((item) => typeof item !== 'string'))
      )
        throw new Error('unsupported');
      return {
        id,
        type: question.type as QuestionType,
        instructions: question.instructions,
        criteria:
          question.type === 'choice'
            ? Object.fromEntries(
                Object.entries(question.criteria as Record<string, string | null>).map(
                  ([key, value]) => [key, value ?? ''],
                ),
              )
            : question.type === 'score'
              ? (question.criteria as string[])
              : undefined,
      };
    });
  } catch {
    return null;
  }
}

function questionsToJson(questions: FormQuestion[]): string {
  return JSON.stringify(
    Object.fromEntries(
      questions.map(({ id, type, instructions, criteria }) => [
        id,
        {
          type,
          instructions,
          ...(type === 'choice'
            ? {
                criteria: Object.fromEntries(
                  Object.entries(criteria as Record<string, string>).map(([key, value]) => [
                    key,
                    value || null,
                  ]),
                ),
              }
            : {}),
          ...(type === 'score' ? { criteria } : {}),
        },
      ]),
    ),
    null,
    2,
  );
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function AnswerCard({ id, answer }: { id: string; answer: JevAnswer }) {
  const primary =
    answer.type === 'noul'
      ? percent(answer.noul ?? 0)
      : answer.type === 'choice'
        ? (answer.choice ?? '未知')
        : String(answer.score ?? '未知');
  return (
    <div className="border-border grid gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <strong className="font-mono text-sm">{id}</strong>
          <span className="text-muted-foreground ml-2 text-xs uppercase">{answer.type}</span>
        </div>
        <span className="text-primary text-lg font-semibold">{primary}</span>
      </div>
      {typeof answer.confidence === 'number' && (
        <div className="text-sm">
          置信度 <strong>{percent(answer.confidence)}</strong>
        </div>
      )}
      {answer.probabilities && (
        <div className="grid gap-2">
          {Object.entries(answer.probabilities).map(([option, probability]) => (
            <div
              key={option}
              className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-2 text-xs"
            >
              <div className="min-w-0">
                <div className="truncate" title={answer.legend?.[option] ?? option}>
                  {answer.legend?.[option] ?? option}
                </div>
                <div className="bg-muted mt-1 h-1.5 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: percent(Math.max(0, Math.min(1, probability))) }}
                  />
                </div>
              </div>
              <span className="text-right font-mono">{percent(probability)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultView({ result }: { result: JevResponse }) {
  return (
    <Card className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">返回结果</h2>
        <span className="text-muted-foreground text-xs">
          {result.model} · 输入 {result.usage?.input_tokens ?? 0} / 输出{' '}
          {result.usage?.output_tokens ?? 0} tokens
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(result.answers).map(([id, answer]) => (
          <AnswerCard key={id} id={id} answer={answer} />
        ))}
      </div>
      <ToolResult value={JSON.stringify(result, null, 2)} label="原始响应 JSON" />
    </Card>
  );
}

export function JevTool() {
  const [apiKey, setApiKey] = useState(readJevApiKey);
  const [keyInput, setKeyInput] = useState('');
  const [editingKey, setEditingKey] = useState(false);
  const [stateInput, setStateInput] = useState(initialState);
  const [stateMode, setStateMode] = useState<StateMode>('文本');
  const [questionsInput, setQuestionsInput] = useState(initialQuestions);
  const [formQuestions, setFormQuestions] = useState<FormQuestion[]>(
    () => formQuestionsFromJson(initialQuestions) ?? [],
  );
  const [advanced, setAdvanced] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [result, setResult] = useState<JevResponse | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const request = buildJevRequest(stateInput, stateMode, questionsInput);

  const saveKey = () => {
    const value = keyInput.trim();
    if (!value) {
      setError('请输入 TypeSafe API Key');
      return;
    }
    try {
      writeJevApiKey(value);
      setApiKey(value);
      setKeyInput('');
      setEditingKey(false);
      setResult(null);
      setError('');
    } catch {
      setError('无法写入本地存储，请检查浏览器设置');
    }
  };
  const clearKey = () => {
    try {
      clearJevApiKey();
      setApiKey('');
      setKeyInput('');
      setEditingKey(false);
      setResult(null);
      setError('');
    } catch {
      setError('无法清除本地密钥，请检查浏览器设置');
    }
  };
  const updateForm = (next: FormQuestion[]) => {
    setFormQuestions(next);
    setQuestionsInput(questionsToJson(next));
    setResult(null);
    setError('');
  };
  const addQuestion = (type: QuestionType) => {
    let index = 1;
    while (formQuestions.some((item) => item.id === `${type}_${index}`)) index++;
    const example = examples[type];
    updateForm([
      ...formQuestions,
      {
        id: `${type}_${index}`,
        type,
        instructions: example.instructions as string,
        criteria:
          type === 'choice'
            ? { billing: '付款或订阅问题', technical: '技术故障或集成问题', sales: '销售咨询' }
            : type === 'score'
              ? ['平静陈述事实', '有些不满', '非常愤怒']
              : undefined,
      },
    ]);
  };
  const returnToForm = () => {
    const parsed = formQuestionsFromJson(questionsInput);
    if (!parsed) {
      setError('当前 JSON 含有表单无法编辑的内容，请在高级模式继续编辑');
      return;
    }
    setFormQuestions(parsed);
    setAdvanced(false);
    setError('');
  };
  const run = async () => {
    if (!advanced && new Set(formQuestions.map((item) => item.id)).size !== formQuestions.length) {
      setError('问题 ID 不能重复');
      setResult(null);
      return;
    }
    if (!request.ok) {
      setError(request.error);
      setResult(null);
      return;
    }
    setBusy(true);
    setError('');
    setResult(null);
    try {
      setResult(await evaluateJev(apiKey, request.value));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Jev 请求失败，请稍后重试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5">
      {!apiKey || editingKey ? (
        <Card className="grid gap-4">
          <p className="text-sm">
            输入 TypeSafe API Key 后即可调用。密钥会保存在此浏览器的本地存储，可随时更换或清除。
          </p>
          <Field label="TypeSafe API Key">
            <Input
              type="password"
              autoComplete="off"
              value={keyInput}
              onChange={(event) => setKeyInput(event.target.value)}
              placeholder="粘贴 API Key"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button onClick={saveKey}>保存密钥</Button>
            {apiKey && <SecondaryButton onClick={() => setEditingKey(false)}>取消</SecondaryButton>}
          </div>
          {error && <ErrorBox>{error}</ErrorBox>}
        </Card>
      ) : (
        <>
          <Card className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>API Key 已保存在此浏览器</span>
            <div className="flex flex-wrap gap-2">
              <SecondaryButton
                onClick={() => {
                  setEditingKey(true);
                  setError('');
                }}
              >
                更换密钥
              </SecondaryButton>
              <SecondaryButton onClick={clearKey}>清除密钥</SecondaryButton>
            </div>
          </Card>
          <Card className="grid gap-5">
            <div className="grid gap-4">
              <Field label="state 格式">
                <OptionSelect
                  aria-label="state 格式"
                  className="w-full sm:w-44"
                  value={stateMode}
                  onValueChange={(value) => {
                    setStateMode(value as StateMode);
                    setResult(null);
                    setError('');
                  }}
                  options={[
                    { value: '文本', label: '文本' },
                    { value: 'JSON', label: 'JSON' },
                  ]}
                />
              </Field>
              <Field label="state 内容">
                <Textarea
                  value={stateInput}
                  onChange={(event) => {
                    setStateInput(event.target.value);
                    setResult(null);
                    setError('');
                  }}
                  spellCheck={false}
                />
              </Field>
            </div>
            <div className="border-border border-t pt-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">问题</h2>
                  <p className="text-muted-foreground text-xs">
                    为同一段 state 添加一个或多个判断问题。
                  </p>
                </div>
                <SecondaryButton
                  onClick={
                    advanced
                      ? returnToForm
                      : () => {
                          setAdvanced(true);
                          setError('');
                        }
                  }
                >
                  {advanced ? '返回表单编辑' : '高级：编辑 JSON'}
                </SecondaryButton>
              </div>
              {advanced ? (
                <Field label="问题 JSON" hint="键是问题 ID；可混合 noul、choice 和 score。">
                  <Textarea
                    aria-label="问题 JSON"
                    className="min-h-72"
                    value={questionsInput}
                    onChange={(event) => {
                      setQuestionsInput(event.target.value);
                      setResult(null);
                      setError('');
                    }}
                    spellCheck={false}
                  />
                </Field>
              ) : (
                <div className="grid gap-3">
                  {formQuestions.map((question, index) => (
                    <div key={index} className="border-border grid gap-4 rounded-xl border p-4">
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
                        <Field label={`问题 ID ${index + 1}`}>
                          <Input
                            value={question.id}
                            onChange={(event) =>
                              updateForm(
                                formQuestions.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, id: event.target.value } : item,
                                ),
                              )
                            }
                          />
                        </Field>
                        <Field label={`问题类型 ${index + 1}`}>
                          <OptionSelect
                            aria-label={`问题类型 ${index + 1}`}
                            value={question.type}
                            onValueChange={(value) => {
                              const type = value as QuestionType;
                              updateForm(
                                formQuestions.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        type,
                                        criteria:
                                          type === 'choice'
                                            ? { option_a: '', option_b: '' }
                                            : type === 'score'
                                              ? ['', '']
                                              : undefined,
                                      }
                                    : item,
                                ),
                              );
                            }}
                            options={[
                              { value: 'noul', label: 'Noul · 是/否' },
                              { value: 'choice', label: 'Choice · 选择' },
                              { value: 'score', label: 'Score · 评分' },
                            ]}
                          />
                        </Field>
                        <SecondaryButton
                          onClick={() =>
                            updateForm(formQuestions.filter((_, itemIndex) => itemIndex !== index))
                          }
                        >
                          删除
                        </SecondaryButton>
                      </div>
                      <Field label={`问题指令 ${index + 1}`}>
                        <Textarea
                          className="min-h-24"
                          value={question.instructions}
                          onChange={(event) =>
                            updateForm(
                              formQuestions.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, instructions: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </Field>
                      {question.type === 'choice' && (
                        <div className="grid gap-2">
                          <span className="text-sm font-medium">选项</span>
                          {Object.entries(question.criteria as Record<string, string>).map(
                            ([key, value], optionIndex, entries) => {
                              const changeOption = (nextKey: string, nextValue: string) =>
                                updateForm(
                                  formQuestions.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? {
                                          ...item,
                                          criteria: Object.fromEntries(
                                            entries.map(([entryKey, entryValue], entryIndex) =>
                                              entryIndex === optionIndex
                                                ? [nextKey, nextValue]
                                                : [entryKey, entryValue],
                                            ),
                                          ),
                                        }
                                      : item,
                                  ),
                                );
                              return (
                                <div
                                  key={optionIndex}
                                  className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-end"
                                >
                                  <Field label={`选项 ID ${index + 1}-${optionIndex + 1}`}>
                                    <Input
                                      value={key}
                                      onChange={(event) => changeOption(event.target.value, value)}
                                    />
                                  </Field>
                                  <Field label={`选项说明 ${index + 1}-${optionIndex + 1}`}>
                                    <Input
                                      value={value}
                                      onChange={(event) => changeOption(key, event.target.value)}
                                    />
                                  </Field>
                                  <SecondaryButton
                                    onClick={() =>
                                      updateForm(
                                        formQuestions.map((item, itemIndex) =>
                                          itemIndex === index
                                            ? {
                                                ...item,
                                                criteria: Object.fromEntries(
                                                  entries.filter(
                                                    (_, entryIndex) => entryIndex !== optionIndex,
                                                  ),
                                                ),
                                              }
                                            : item,
                                        ),
                                      )
                                    }
                                  >
                                    移除
                                  </SecondaryButton>
                                </div>
                              );
                            },
                          )}
                          <SecondaryButton
                            className="justify-self-start"
                            onClick={() => {
                              const criteria = question.criteria as Record<string, string>;
                              let number = 1;
                              while (`option_${number}` in criteria) number++;
                              updateForm(
                                formQuestions.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        criteria: { ...criteria, [`option_${number}`]: '' },
                                      }
                                    : item,
                                ),
                              );
                            }}
                          >
                            添加选项
                          </SecondaryButton>
                        </div>
                      )}
                      {question.type === 'score' && (
                        <Field
                          label={`评分等级 ${index + 1}`}
                          hint="每行一个等级，按分数从低到高排列"
                        >
                          <div className="grid gap-2">
                            {(question.criteria as string[]).map((level, levelIndex, levels) => (
                              <div key={levelIndex} className="flex gap-2">
                                <Input
                                  aria-label={`评分等级 ${index + 1}-${levelIndex + 1}`}
                                  value={level}
                                  onChange={(event) =>
                                    updateForm(
                                      formQuestions.map((item, itemIndex) =>
                                        itemIndex === index
                                          ? {
                                              ...item,
                                              criteria: levels.map((value, valueIndex) =>
                                                valueIndex === levelIndex
                                                  ? event.target.value
                                                  : value,
                                              ),
                                            }
                                          : item,
                                      ),
                                    )
                                  }
                                />
                                <SecondaryButton
                                  onClick={() =>
                                    updateForm(
                                      formQuestions.map((item, itemIndex) =>
                                        itemIndex === index
                                          ? {
                                              ...item,
                                              criteria: levels.filter(
                                                (_, valueIndex) => valueIndex !== levelIndex,
                                              ),
                                            }
                                          : item,
                                      ),
                                    )
                                  }
                                >
                                  移除
                                </SecondaryButton>
                              </div>
                            ))}
                            <SecondaryButton
                              className="justify-self-start"
                              onClick={() =>
                                updateForm(
                                  formQuestions.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? {
                                          ...item,
                                          criteria: [...(question.criteria as string[]), ''],
                                        }
                                      : item,
                                  ),
                                )
                              }
                            >
                              添加等级
                            </SecondaryButton>
                          </div>
                        </Field>
                      )}
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <SecondaryButton onClick={() => addQuestion('noul')}>
                      添加 Noul 问题
                    </SecondaryButton>
                    <SecondaryButton onClick={() => addQuestion('choice')}>
                      添加 Choice 问题
                    </SecondaryButton>
                    <SecondaryButton onClick={() => addQuestion('score')}>
                      添加 Score 问题
                    </SecondaryButton>
                  </div>
                </div>
              )}
            </div>
            {error && <ErrorBox>{error}</ErrorBox>}
            <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-5">
              <Button
                onClick={() => {
                  void run();
                }}
                disabled={busy}
              >
                {busy ? '调用中…' : '调用 Jev'}
              </Button>
              <SecondaryButton
                aria-expanded={previewOpen}
                onClick={() => setPreviewOpen(!previewOpen)}
              >
                {previewOpen ? '收起请求 JSON 预览' : '展开请求 JSON 预览'}
              </SecondaryButton>
            </div>
            {previewOpen &&
              (request.ok ? (
                <ToolResult value={JSON.stringify(request.value, null, 2)} label="请求 JSON 预览" />
              ) : (
                <ErrorBox>{request.error}</ErrorBox>
              ))}
          </Card>
          {result && <ResultView result={result} />}
        </>
      )}
    </div>
  );
}

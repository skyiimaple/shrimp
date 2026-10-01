import type { ProviderId } from './types';
import { readSseData } from './sse';

export interface CompletionMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
}

export type CompletionEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; id: string; name: string; arguments: string }
  | { type: 'done' };

export async function streamCompletion(options: {
  provider: ProviderId;
  model: string;
  key: string;
  messages: CompletionMessage[];
  tools: unknown[];
  signal: AbortSignal;
  onEvent: (event: CompletionEvent) => void;
  fetcher?: typeof fetch;
}): Promise<void> {
  const { provider, model, key, messages, tools, signal, onEvent, fetcher = fetch } = options;
  const url =
    provider === 'deepseek'
      ? 'https://api.deepseek.com/chat/completions'
      : 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
  let response: Response;
  try {
    response = await fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages,
        tools,
        tool_choice: tools.length ? 'auto' : 'none',
        stream: true,
      }),
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw new DOMException('请求已取消', 'AbortError');
    throw new Error(
      error instanceof TypeError ? '浏览器无法连接模型服务；请检查网络或跨域限制' : '模型连接失败',
    );
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403)
      throw new Error('API Key 认证失败，请检查配置');
    if (response.status === 429) throw new Error('模型请求过于频繁，请稍后再试');
    throw new Error(`模型服务返回错误（HTTP ${response.status}）`);
  }
  if (!response.body) throw new Error('模型服务未返回流式响应');

  const calls = new Map<number, { id: string; name: string; arguments: string }>();
  let completed = false;
  let textLength = 0;
  for await (const data of readSseData(response.body)) {
    if (signal.aborted) throw new DOMException('请求已取消', 'AbortError');
    if (data === '[DONE]') {
      completed = true;
      break;
    }
    let chunk: unknown;
    try {
      chunk = JSON.parse(data);
    } catch {
      throw new Error('模型返回了无法解析的数据');
    }
    const choice = (
      chunk as {
        choices?: Array<{
          delta?: {
            content?: string | null;
            tool_calls?: Array<{
              index: number;
              id?: string;
              function?: { name?: string; arguments?: string };
            }>;
          };
        }>;
      }
    ).choices?.[0];
    const delta = choice?.delta;
    if (delta?.content) {
      textLength += delta.content.length;
      if (textLength > 12000) throw new Error('模型回复过长，已停止接收');
      onEvent({ type: 'text', text: delta.content });
    }
    for (const piece of delta?.tool_calls ?? []) {
      if (!Number.isInteger(piece.index) || piece.index < 0 || piece.index > 4)
        throw new Error('模型工具调用数量超限');
      const call = calls.get(piece.index) ?? { id: '', name: '', arguments: '' };
      call.id = piece.id ?? call.id;
      call.name += piece.function?.name ?? '';
      call.arguments += piece.function?.arguments ?? '';
      if (call.arguments.length > 12000) throw new Error('模型工具参数过长');
      calls.set(piece.index, call);
    }
  }
  if (!completed) throw new Error('模型流式响应意外中断');
  for (const [, call] of [...calls.entries()].sort(([a], [b]) => a - b)) {
    if (!call.id || !call.name) throw new Error('模型返回了不完整的工具调用');
    onEvent({ type: 'tool_call', ...call });
  }
  onEvent({ type: 'done' });
}

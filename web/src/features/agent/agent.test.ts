import { describe, expect, it, vi } from 'vitest';
import { runAgentTurn } from './agent';
import type { ChatMessage } from './types';
import type { CompletionEvent } from './providers';

const settings = {
  provider: 'deepseek' as const,
  models: { deepseek: 'deepseek-chat', glm: 'glm-4.5' },
  keys: { deepseek: 'secret', glm: '' },
};

describe('Agent turn', () => {
  it('frames ordinary questions as general chat and keeps tools optional', async () => {
    const complete = vi.fn(
      async ({
        messages,
        tools,
        onEvent,
      }: Parameters<typeof import('./providers').streamCompletion>[0]) => {
        expect(messages[0].role).toBe('system');
        expect(messages[0].content).toContain('普通问答');
        expect(messages[0].content).not.toContain('仅可调用');
        expect(messages[0].content).not.toContain('不要声称具备网络访问');
        expect(tools.length).toBeGreaterThan(0);
        onEvent({ type: 'text', text: '这是一个普通问题的回答。' });
        onEvent({ type: 'done' });
      },
    );
    const records: ChatMessage[] = [];
    await runAgentTurn({
      history: [],
      userText: '解释一下什么是递归',
      settings,
      signal: new AbortController().signal,
      onMessage: (message) => records.push(message),
      complete,
    });
    expect(records.at(-1)).toMatchObject({
      role: 'assistant',
      content: '这是一个普通问题的回答。',
      status: 'complete',
    });
  });
  it('streams one answer and records user plus completed assistant', async () => {
    const records = new Map<string, ChatMessage>();
    const complete = vi.fn(async ({ onEvent }: { onEvent: (event: CompletionEvent) => void }) => {
      onEvent({ type: 'text', text: '你' });
      onEvent({ type: 'text', text: '好' });
      onEvent({ type: 'done' });
    });
    await runAgentTurn({
      history: [],
      userText: '你好',
      settings,
      signal: new AbortController().signal,
      onMessage: (message) => records.set(message.id, message),
      complete,
    });
    expect([...records.values()].map((item) => [item.role, item.content, item.status])).toEqual([
      ['user', '你好', 'complete'],
      ['assistant', '你好', 'complete'],
    ]);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('executes approved tool and sends its result back to the model', async () => {
    const records = new Map<string, ChatMessage>();
    let round = 0;
    const complete = vi.fn(
      async ({
        onEvent,
        messages,
      }: {
        onEvent: (event: CompletionEvent) => void;
        messages: Array<{ role: string; content: string | null }>;
      }) => {
        round++;
        if (round === 1) {
          onEvent({
            type: 'tool_call',
            id: 'call-1',
            name: 'json_transform',
            arguments: '{"mode":"minify","input":"{ \\"a\\": 1 }"}',
          });
        } else {
          expect(messages.at(-1)).toMatchObject({ role: 'tool', content: '{"a":1}' });
          onEvent({ type: 'text', text: '压缩好了' });
        }
        onEvent({ type: 'done' });
      },
    );
    await runAgentTurn({
      history: [],
      userText: '压缩 JSON',
      settings,
      signal: new AbortController().signal,
      onMessage: (message) => records.set(message.id, message),
      complete,
    });
    expect([...records.values()].filter((item) => item.role === 'tool')).toMatchObject([
      { toolName: 'json_transform', content: '{"a":1}' },
    ]);
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it('marks partial reply interrupted when stopped', async () => {
    const controller = new AbortController();
    const records = new Map<string, ChatMessage>();
    const complete = vi.fn(async ({ onEvent }: { onEvent: (event: CompletionEvent) => void }) => {
      onEvent({ type: 'text', text: '部分' });
      controller.abort();
      throw new DOMException('aborted', 'AbortError');
    });
    await runAgentTurn({
      history: [],
      userText: '开始',
      settings,
      signal: controller.signal,
      onMessage: (message) => records.set(message.id, message),
      complete,
    });
    expect([...records.values()].at(-1)).toMatchObject({ content: '部分', status: 'interrupted' });
  });

  it('keeps a failed tool result paired with its assistant call in later context', async () => {
    const history: ChatMessage[] = [
      { id: 'u', role: 'user', content: '处理', createdAt: 1, status: 'complete' },
      {
        id: 'a',
        role: 'assistant',
        content: '',
        createdAt: 2,
        status: 'complete',
        toolCalls: [{ id: 'call-x', name: 'json_transform', arguments: '{}' }],
      },
      {
        id: 't',
        role: 'tool',
        content: 'JSON 参数无效',
        createdAt: 3,
        status: 'error',
        toolCallId: 'call-x',
        toolName: 'json_transform',
      },
    ];
    const complete = vi.fn(
      async ({
        messages,
        onEvent,
      }: {
        messages: Array<{ role: string; content: string | null }>;
        onEvent: (event: CompletionEvent) => void;
      }) => {
        expect(
          messages.some(
            (message) => message.role === 'assistant' && message.content?.includes('JSON 参数无效'),
          ),
        ).toBe(true);
        expect(messages.filter((message) => message.role === 'tool')).toEqual([]);
        onEvent({ type: 'text', text: '收到' });
        onEvent({ type: 'done' });
      },
    );
    await runAgentTurn({
      history,
      userText: '继续',
      settings,
      signal: new AbortController().signal,
      onMessage: () => {},
      complete,
    });
  });

  it('records cancellation results for every proposed tool call before stopping', async () => {
    const controller = new AbortController();
    const records = new Map<string, ChatMessage>();
    const complete = vi.fn(async ({ onEvent }: { onEvent: (event: CompletionEvent) => void }) => {
      onEvent({
        type: 'tool_call',
        id: 'call-1',
        name: 'regex_match',
        arguments: '{"pattern":"a","flags":"","text":"a"}',
      });
      onEvent({ type: 'tool_call', id: 'call-2', name: 'uuid_generate', arguments: '{"count":1}' });
      onEvent({ type: 'done' });
    });
    const execute = vi.fn(async () => {
      controller.abort();
      return { ok: false, content: '操作已取消' };
    });
    await runAgentTurn({
      history: [],
      userText: '执行两个工具',
      settings,
      signal: controller.signal,
      onMessage: (message) => records.set(message.id, message),
      complete,
      execute,
    });
    const toolRecords = [...records.values()].filter((message) => message.role === 'tool');
    expect(toolRecords.map((message) => message.toolCallId)).toEqual(['call-1', 'call-2']);
    expect(toolRecords.map((message) => message.content)).toEqual(['操作已取消', '操作已取消']);
  });

  it('summarizes old tool cycles without replaying large function arguments', async () => {
    const history: ChatMessage[] = [
      { id: 'u', role: 'user', content: '处理', createdAt: 1, status: 'complete' },
      {
        id: 'a',
        role: 'assistant',
        content: '',
        createdAt: 2,
        status: 'complete',
        toolCalls: [{ id: 'c', name: 'json_transform', arguments: 'x'.repeat(12000) }],
      },
      {
        id: 't',
        role: 'tool',
        content: '处理失败',
        createdAt: 3,
        status: 'error',
        toolCallId: 'c',
        toolName: 'json_transform',
      },
    ];
    const complete = vi.fn(
      async ({
        messages,
        onEvent,
      }: {
        messages: Array<{ role: string; content: string | null }>;
        onEvent: (event: CompletionEvent) => void;
      }) => {
        expect(JSON.stringify(messages).length).toBeLessThan(10000);
        expect(messages.some((message) => message.content?.includes('处理失败'))).toBe(true);
        onEvent({ type: 'text', text: '收到' });
        onEvent({ type: 'done' });
      },
    );
    await runAgentTurn({
      history,
      userText: '继续',
      settings,
      signal: new AbortController().signal,
      onMessage: () => {},
      complete,
    });
  });

  it('does not contact the model when local message persistence fails', async () => {
    const complete = vi.fn(async () => {});
    const beforeRequest = vi.fn(async () => {
      throw new Error('聊天记录保存失败');
    });
    await expect(
      runAgentTurn({
        history: [],
        userText: '你好',
        settings,
        signal: new AbortController().signal,
        onMessage: () => {},
        complete,
        beforeRequest,
      }),
    ).rejects.toThrow('聊天记录保存失败');
    expect(complete).not.toHaveBeenCalled();
  });
});

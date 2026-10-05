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

  it('executes a newly approved pure text tool and displays its result', async () => {
    const records: ChatMessage[] = [];
    let round = 0;
    const complete = vi.fn(
      async ({
        onEvent,
        messages,
      }: Parameters<typeof import('./providers').streamCompletion>[0]) => {
        round++;
        if (round === 1) {
          onEvent({
            type: 'tool_call',
            id: 'call-url',
            name: 'url_transform',
            arguments: '{"mode":"encode","input":"a b"}',
          });
        } else {
          expect(messages.at(-1)).toMatchObject({ role: 'tool', content: 'a%20b' });
          onEvent({ type: 'text', text: '已编码' });
        }
        onEvent({ type: 'done' });
      },
    );
    await runAgentTurn({
      history: [],
      userText: '编码 URL',
      settings,
      signal: new AbortController().signal,
      onMessage: (message) => records.push(message),
      complete,
    });
    expect(records.find((message) => message.role === 'tool')).toMatchObject({
      toolName: 'url_transform',
      content: 'a%20b',
    });
  });

  it('round-trips the second batch of approved tools through the model protocol', async () => {
    const records: ChatMessage[] = [];
    let round = 0;
    const calls = [
      ['jwt_decode', '{"input":"eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjMifQ.signature"}'],
      ['color_convert', '{"input":"#ff0000"}'],
      ['radix_convert', '{"input":"255","from":10,"to":16}'],
      ['query_transform', '{"mode":"parse","input":"?a=1"}'],
      ['hash_text', '{"input":"abc","algorithm":"SHA-256"}'],
    ];
    const complete = vi.fn(
      async ({
        onEvent,
        messages,
      }: Parameters<typeof import('./providers').streamCompletion>[0]) => {
        round++;
        if (round === 1) {
          calls.forEach(([name, argumentsValue], index) =>
            onEvent({ type: 'tool_call', id: `call-${index}`, name, arguments: argumentsValue }),
          );
        } else {
          expect(messages.filter((message) => message.role === 'tool')).toHaveLength(5);
          onEvent({ type: 'text', text: '已完成第二批工具调用' });
        }
        onEvent({ type: 'done' });
      },
    );
    await runAgentTurn({
      history: [],
      userText: '依次处理这些本地数据',
      settings,
      signal: new AbortController().signal,
      onMessage: (message) => records.push(message),
      complete,
    });
    expect(records.filter((message) => message.role === 'tool')).toHaveLength(5);
    expect(records.at(-1)).toMatchObject({ content: '已完成第二批工具调用', status: 'complete' });
  });

  it('round-trips structured data tools and returns their local results', async () => {
    const records: ChatMessage[] = [];
    let round = 0;
    const calls = [
      ['json_diff', '{"left":"{\\"a\\":1}","right":"{\\"a\\":2}"}'],
      ['csv_json_transform', '{"mode":"to_json","format":"csv","input":"a\\n1"}'],
      ['structured_data_transform', '{"mode":"yaml_to_json","input":"name: shrimp"}'],
      ['yaml_format', '{"input":"name: shrimp"}'],
    ];
    const complete = vi.fn(
      async ({
        onEvent,
        messages,
      }: Parameters<typeof import('./providers').streamCompletion>[0]) => {
        round++;
        if (round === 1) {
          calls.forEach(([name, argumentsValue], index) =>
            onEvent({
              type: 'tool_call',
              id: `structured-${index}`,
              name,
              arguments: argumentsValue,
            }),
          );
        } else {
          expect(messages.filter((message) => message.role === 'tool')).toHaveLength(4);
          onEvent({ type: 'text', text: '结构化数据处理完成' });
        }
        onEvent({ type: 'done' });
      },
    );
    await runAgentTurn({
      history: [],
      userText: '处理结构化数据',
      settings,
      signal: new AbortController().signal,
      onMessage: (message) => records.push(message),
      complete,
    });
    expect(records.filter((message) => message.role === 'tool')).toHaveLength(4);
    expect(records.at(-1)).toMatchObject({ content: '结构化数据处理完成', status: 'complete' });
  });

  it('round-trips the fourth batch of conversion tools', async () => {
    const records: ChatMessage[] = [];
    let round = 0;
    const calls = [
      ['roman_numeral', '{"mode":"to_roman","input":"42"}'],
      ['numeronym', '{"input":"internationalization"}'],
      ['binary_text_transform', '{"mode":"to_binary","input":"A"}'],
      ['unicode_text_transform', '{"mode":"to_unicode","input":"虾"}'],
      ['temperature_convert', '{"value":0,"from":"C","to":"F"}'],
    ];
    const complete = vi.fn(
      async ({
        onEvent,
        messages,
      }: Parameters<typeof import('./providers').streamCompletion>[0]) => {
        round++;
        if (round === 1) {
          calls.forEach(([name, argumentsValue], index) =>
            onEvent({
              type: 'tool_call',
              id: `conversion-${index}`,
              name,
              arguments: argumentsValue,
            }),
          );
        } else {
          expect(messages.filter((message) => message.role === 'tool')).toHaveLength(5);
          onEvent({ type: 'text', text: '转换完成' });
        }
        onEvent({ type: 'done' });
      },
    );
    await runAgentTurn({
      history: [],
      userText: '做几项本地转换',
      settings,
      signal: new AbortController().signal,
      onMessage: (message) => records.push(message),
      complete,
    });
    expect(records.filter((message) => message.role === 'tool')).toHaveLength(5);
    expect(records.at(-1)).toMatchObject({ content: '转换完成', status: 'complete' });
  });

  it('round-trips local network and reference tools', async () => {
    const records: ChatMessage[] = [];
    let round = 0;
    const calls = [
      ['ipv4_subnet', '{"input":"192.168.1.10/24"}'],
      ['ipv4_address', '{"input":"0xC0A80101"}'],
      ['mac_address_generate', '{}'],
      ['mime_lookup', '{"query":"json"}'],
      ['http_status_lookup', '{"query":"404"}'],
    ];
    const complete = vi.fn(
      async ({
        onEvent,
        messages,
      }: Parameters<typeof import('./providers').streamCompletion>[0]) => {
        round++;
        if (round === 1) {
          calls.forEach(([name, argumentsValue], index) =>
            onEvent({ type: 'tool_call', id: `network-${index}`, name, arguments: argumentsValue }),
          );
        } else {
          expect(messages.filter((message) => message.role === 'tool')).toHaveLength(5);
          onEvent({ type: 'text', text: '本地查询完成' });
        }
        onEvent({ type: 'done' });
      },
    );
    await runAgentTurn({
      history: [],
      userText: '查询这些本地信息',
      settings,
      signal: new AbortController().signal,
      onMessage: (message) => records.push(message),
      complete,
    });
    expect(records.filter((message) => message.role === 'tool')).toHaveLength(5);
    expect(records.at(-1)).toMatchObject({ content: '本地查询完成', status: 'complete' });
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

import { describe, expect, it, vi } from 'vitest';
import { streamCompletion } from './providers';

function sseResponse(parts: string[]) {
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const part of parts) controller.enqueue(new TextEncoder().encode(part));
        controller.close();
      },
    }),
    { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
  );
}

describe('provider completion stream', () => {
  it('calls only the fixed DeepSeek endpoint and joins text/tool arguments', async () => {
    const fetcher = vi.fn(async () =>
      sseResponse([
        'data: {"choices":[{"delta":{"content":"你", "tool_calls":[{"index":0,"id":"c1","function":{"name":"json_transform","arguments":"{\\"mode\\":\\"format\\","}}]}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"好", "tool_calls":[{"index":0,"function":{"arguments":"\\"input\\":\\"{}\\"}"}}]}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    );
    const events: unknown[] = [];
    await streamCompletion({
      provider: 'deepseek',
      model: 'deepseek-chat',
      key: 'secret',
      messages: [{ role: 'user', content: '你好' }],
      tools: [],
      signal: new AbortController().signal,
      onEvent: (event) => events.push(event),
      fetcher,
    });
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.deepseek.com/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
    const headers = (fetcher.mock.calls[0] as unknown as [string, RequestInit])[1]
      .headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer secret');
    expect(events).toContainEqual({ type: 'text', text: '你' });
    expect(events).toContainEqual({ type: 'text', text: '好' });
    expect(events).toContainEqual({
      type: 'tool_call',
      id: 'c1',
      name: 'json_transform',
      arguments: '{"mode":"format","input":"{}"}',
    });
  });

  it('maps GLM to its own fixed endpoint and redacts API errors', async () => {
    const fetcher = vi.fn(async () => new Response('bad secret', { status: 401 }));
    await expect(
      streamCompletion({
        provider: 'glm',
        model: 'glm-4.5',
        key: 'secret',
        messages: [{ role: 'user', content: 'hi' }],
        tools: [],
        signal: new AbortController().signal,
        onEvent: () => {},
        fetcher,
      }),
    ).rejects.toThrow('认证失败');
    expect((fetcher.mock.calls as unknown as Array<[string, RequestInit]>)[0]?.[0]).toBe(
      'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    );
  });

  it('stops an excessively long streamed answer', async () => {
    const fetcher = vi.fn(async () =>
      sseResponse([
        `data: ${JSON.stringify({ choices: [{ delta: { content: 'x'.repeat(12001) } }] })}\n\n`,
        'data: [DONE]\n\n',
      ]),
    );
    await expect(
      streamCompletion({
        provider: 'deepseek',
        model: 'deepseek-chat',
        key: 'secret',
        messages: [{ role: 'user', content: 'hi' }],
        tools: [],
        signal: new AbortController().signal,
        onEvent: () => {},
        fetcher,
      }),
    ).rejects.toThrow('过长');
  });
});

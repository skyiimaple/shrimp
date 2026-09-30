import { afterEach, describe, expect, it, vi } from 'vitest';
import { evaluateJev, JevApiError } from './client';

describe('Jev 本地客户端', () => {
  afterEach(() => vi.restoreAllMocks());

  it('向固定本地接口发送密钥并解析结构化答案', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          model: 'jev-1.13.0',
          answers: { urgent: { type: 'noul', noul: 0.95 } },
          usage: { input_tokens: 20, output_tokens: 4 },
        }),
        { status: 200 },
      ),
    );
    const result = await evaluateJev('secret-key', {
      model: 'jev-latest',
      state: 'ticket',
      questions: { urgent: { type: 'noul', instructions: 'Urgent?' } },
    });
    expect(fetcher).toHaveBeenCalledWith(
      '/api/jev/evaluate',
      expect.objectContaining({ method: 'POST' }),
    );
    const init = fetcher.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(init.headers).toMatchObject({ Authorization: 'Bearer secret-key' });
    expect(body).toMatchObject({ state: 'ticket', model: 'jev-latest' });
    expect(JSON.stringify(body)).not.toContain('secret-key');
    expect(result.answers.urgent).toMatchObject({ type: 'noul', noul: 0.95 });
  });

  it('401 和网络错误给出可理解的中文反馈', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('{"message":"unauthorized"}', { status: 401 }))
      .mockRejectedValueOnce(new Error('network'));
    const request = {
      model: 'jev-latest' as const,
      state: 'ticket',
      questions: { urgent: { type: 'noul', instructions: 'Urgent?' } },
    };
    await expect(evaluateJev('bad-key', request)).rejects.toEqual(
      new JevApiError(401, 'API Key 无效，请检查后重试'),
    );
    await expect(evaluateJev('key', request)).rejects.toMatchObject({
      message: '无法连接本地服务，请确认后端已启动',
    });
  });
});

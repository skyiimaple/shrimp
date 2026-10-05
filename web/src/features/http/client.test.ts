import { afterEach, describe, expect, it, vi } from 'vitest';
import { getHttpProxyStatus, ProxyApiError, sendHttpRequest } from './client';

describe('HTTP 代理客户端', () => {
  afterEach(() => vi.restoreAllMocks());
  it('保留统一 API 错误', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'TARGET_BLOCKED', message: '目标地址不允许访问' }), {
        status: 403,
      }),
    );
    await expect(
      sendHttpRequest({ url: 'http://169.254.169.254', method: 'GET', headers: {} }),
    ).rejects.toEqual(new ProxyApiError('TARGET_BLOCKED', '目标地址不允许访问'));
  });
  it('解析成功响应', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 200,
          headers: {},
          body: 'ok',
          bodyEncoding: 'text',
          durationMs: 12,
        }),
      ),
    );
    await expect(
      sendHttpRequest({ url: 'https://example.com', method: 'GET', headers: {} }),
    ).resolves.toMatchObject({ status: 200, body: 'ok' });
  });
  it('从本地状态接口读取代理能力', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          available: true,
          allowedMethods: ['GET', 'POST'],
          timeoutMs: 2500,
          maxResponseBytes: 4096,
          maxRedirects: 2,
        }),
      ),
    );
    await expect(getHttpProxyStatus()).resolves.toEqual({
      available: true,
      allowedMethods: ['GET', 'POST'],
      timeoutMs: 2500,
      maxResponseBytes: 4096,
      maxRedirects: 2,
    });
    expect(fetcher).toHaveBeenCalledWith('/api/http/status', expect.any(Object));
  });
  it('状态接口不可用时不把错误页面当作在线', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>Not Found</html>', { status: 404 }),
    );
    await expect(getHttpProxyStatus()).rejects.toThrow('无法连接本地代理服务');
  });
});

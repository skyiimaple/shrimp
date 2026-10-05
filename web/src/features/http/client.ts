import type { HttpProxyStatus, HttpSendRequest, HttpSendResponse } from './types';
export class ProxyApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ProxyApiError';
  }
}
export async function getHttpProxyStatus(): Promise<HttpProxyStatus> {
  let response: Response;
  try {
    response = await fetch('/api/http/status', { cache: 'no-store' });
  } catch {
    throw new ProxyApiError('NETWORK_ERROR', '无法连接本地代理服务');
  }
  if (!response.ok) throw new ProxyApiError('NETWORK_ERROR', '无法连接本地代理服务');
  const data: unknown = await response.json().catch(() => null);
  if (
    !data ||
    typeof data !== 'object' ||
    typeof (data as HttpProxyStatus).available !== 'boolean' ||
    !Array.isArray((data as HttpProxyStatus).allowedMethods) ||
    !(data as HttpProxyStatus).allowedMethods.every((method) => typeof method === 'string') ||
    !Number.isFinite((data as HttpProxyStatus).timeoutMs) ||
    !Number.isFinite((data as HttpProxyStatus).maxResponseBytes) ||
    !Number.isFinite((data as HttpProxyStatus).maxRedirects)
  ) {
    throw new ProxyApiError('INVALID_RESPONSE', '本地代理返回了无效状态');
  }
  return data as HttpProxyStatus;
}
export async function sendHttpRequest(
  request: HttpSendRequest,
  signal?: AbortSignal,
): Promise<HttpSendResponse> {
  let response: Response;
  try {
    response = await fetch('/api/http/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    });
  } catch {
    throw new ProxyApiError('NETWORK_ERROR', '无法连接本地代理服务，请确认后端已启动');
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = data as { code?: string; message?: string } | null;
    throw new ProxyApiError(
      error?.code ?? 'REQUEST_FAILED',
      error?.message ?? '请求失败，请稍后重试',
    );
  }
  return data as HttpSendResponse;
}

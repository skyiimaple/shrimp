import type { IncomingMessage, ServerResponse } from 'node:http';

type VercelRequest = IncomingMessage & { body?: unknown };
export const MAX_REQUEST_BYTES = 262_144;
const MAX_RESPONSE_BYTES = 2_097_152;
const JEV_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';

async function readResponse(response: Response): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_RESPONSE_BYTES) throw new Error('RESPONSE_TOO_LARGE');
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8');
}

export function isRequestTooLarge(body: unknown, contentLength?: string): boolean {
  if (contentLength && Number(contentLength) > MAX_REQUEST_BYTES) return true;
  const serialized = JSON.stringify(body);
  return serialized !== undefined && Buffer.byteLength(serialized) > MAX_REQUEST_BYTES;
}

export async function forwardJevRequest(
  body: unknown,
  authorization: string | undefined,
  fetchUpstream: typeof fetch = fetch,
  endpoint = JEV_ENDPOINT,
): Promise<{ status: number; body: string }> {
  const result = (status: number, message: string) => ({
    status,
    body: JSON.stringify({ message }),
  });
  if (!authorization?.startsWith('Bearer ') || !authorization.slice(7).trim())
    return result(400, '请输入 TypeSafe API Key');
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    !('state' in body) ||
    !('questions' in body) ||
    !body.questions ||
    typeof body.questions !== 'object' ||
    Array.isArray(body.questions)
  )
    return result(400, 'Jev 请求结构无效');
  const state = body.state;
  if (typeof state !== 'string' && (!state || typeof state !== 'object'))
    return result(400, 'state 格式无效');
  try {
    const upstream = await fetchUpstream(endpoint, {
      method: 'POST',
      redirect: 'manual',
      headers: { Authorization: authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'jev-latest', state, questions: body.questions }),
      signal: AbortSignal.timeout(20_000),
    });
    if (upstream.status >= 300 && upstream.status < 400)
      return result(502, 'Jev 上游返回重定向，已停止请求');
    return {
      status: upstream.status,
      body: (await readResponse(upstream)).split(authorization.slice(7)).join('<redacted>'),
    };
  } catch (error) {
    return result(
      502,
      error instanceof Error && error.message === 'RESPONSE_TOO_LARGE'
        ? 'Jev 响应超过大小限制'
        : '无法连接 Jev 服务',
    );
  }
}

function respond(response: ServerResponse, status: number, message: string): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify({ message }));
}

export default async function handler(
  request: VercelRequest,
  response: ServerResponse,
): Promise<void> {
  if (request.method !== 'POST') {
    respond(response, 405, '只支持 POST 请求');
    return;
  }
  const origin = request.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.host) {
        respond(response, 403, '只允许同源请求');
        return;
      }
    } catch {
      respond(response, 403, '请求来源无效');
      return;
    }
  }
  if (isRequestTooLarge(request.body, request.headers['content-length'])) {
    respond(response, 413, '请求内容超过大小限制');
    return;
  }
  const result = await forwardJevRequest(request.body, request.headers.authorization);
  response.writeHead(result.status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(result.body);
}

import type { IncomingMessage, ServerResponse } from 'node:http';

const JEV_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
const MAX_REQUEST_BYTES = 262_144;
const MAX_RESPONSE_BYTES = 2_097_152;

function respond(response: ServerResponse, status: number, message: string): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify({ message }));
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > MAX_REQUEST_BYTES) throw new Error('REQUEST_TOO_LARGE');
    chunks.push(bytes);
  }
  return Buffer.concat(chunks).toString('utf8');
}

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

export function createJevProxyHandler(
  fetchUpstream: typeof fetch = fetch,
  endpoint = JEV_ENDPOINT,
): (request: IncomingMessage, response: ServerResponse) => Promise<void> {
  return async (request, response) => {
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
    try {
      const body: unknown = JSON.parse(await readBody(request));
      const result = await forwardJevRequest(
        body,
        request.headers.authorization,
        fetchUpstream,
        endpoint,
      );
      response.writeHead(result.status, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(result.body);
    } catch (error) {
      if (error instanceof Error && error.message === 'REQUEST_TOO_LARGE') {
        respond(response, 413, '请求内容超过大小限制');
      } else if (error instanceof SyntaxError) {
        respond(response, 400, '请求 JSON 格式无效');
      } else {
        respond(response, 502, '无法连接 Jev 服务');
      }
    }
  };
}

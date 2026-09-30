import type { IncomingMessage, ServerResponse } from 'node:http';
// Vercel 按 Node ESM 原样执行编译后的 .js，不会补扩展名。这里必须指向产物 local-proxy.js。
import { forwardJevRequest, isRequestTooLarge } from '../../local-proxy.js';

type VercelRequest = IncomingMessage & { body?: unknown };

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

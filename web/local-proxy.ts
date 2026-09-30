import type { IncomingMessage, ServerResponse } from 'node:http';
import { forwardJevRequest, MAX_REQUEST_BYTES } from './api/jev/evaluate';

const JEV_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';

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

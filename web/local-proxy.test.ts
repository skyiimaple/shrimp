// @vitest-environment node
import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createJevProxyHandler } from './local-proxy';

const servers: Array<ReturnType<typeof createServer>> = [];
afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
  vi.restoreAllMocks();
});

async function localUrl(handler: ReturnType<typeof createJevProxyHandler>) {
  const server = createServer((request, response) => {
    void handler(request, response);
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

describe('Jev 本地转发', () => {
  it('只向固定上游发送密钥，转发请求内容，且禁止重定向', async () => {
    const upstream = vi.fn().mockResolvedValue(
      new Response('{"answers":{},"model":"jev-1.13.0"}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const endpoint = 'https://api.typesafe.ai/v1/systemone';
    const url = await localUrl(createJevProxyHandler(upstream, endpoint));
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Bearer secret-key', 'Content-Type': 'application/json' },
      body: '{"model":"jev-latest","state":"hello","questions":{"urgent":{"type":"noul","instructions":"Urgent?"}}}',
    });
    expect(response.status).toBe(200);
    expect((await response.json()).model).toBe('jev-1.13.0');
    expect(upstream).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({ method: 'POST', redirect: 'manual' }),
    );
    const options = upstream.mock.calls[0][1] as RequestInit;
    expect(options.headers).toMatchObject({ Authorization: 'Bearer secret-key' });
    expect(String(options.body)).not.toContain('secret-key');
  });

  it('无密钥或上游重定向不会泄漏 Location', async () => {
    const upstream = vi
      .fn()
      .mockResolvedValue(
        new Response('', { status: 307, headers: { Location: 'https://example.com/leak' } }),
      );
    const url = await localUrl(createJevProxyHandler(upstream));
    const missing = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(missing.status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
    const redirect = await fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Bearer secret-key', 'Content-Type': 'application/json' },
      body: '{"state":"hello","questions":{"urgent":{"type":"noul","instructions":"Urgent?"}}}',
    });
    expect(redirect.status).toBe(502);
    expect(redirect.headers.get('Location')).toBeNull();
  });
});

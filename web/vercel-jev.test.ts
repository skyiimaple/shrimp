// @vitest-environment node
import { createServer, request as httpRequest } from 'node:http';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import ts from 'typescript';
import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from './api/jev/evaluate';

const servers: Array<ReturnType<typeof createServer>> = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
});

async function callFunction(body: string, authorization?: string) {
  const server = createServer(async (incoming, outgoing) => {
    const chunks: Buffer[] = [];
    for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    await handler(Object.assign(incoming, { body: parsed }), outgoing);
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  return new Promise<{ status: number; body: string; location?: string }>((resolve, reject) => {
    const req = httpRequest(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/jev/evaluate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authorization ? { Authorization: authorization } : {}),
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () =>
          resolve({
            status: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
            location: response.headers.location,
          }),
        );
      },
    );
    req.on('error', reject);
    req.end(body);
  });
}

describe('Vercel Jev Function', () => {
  it('编译后的入口可独立加载，不依赖部署包外的 TS 模块', () => {
    const source = readFileSync(new URL('./api/jev/evaluate.ts', import.meta.url), 'utf8');
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const url = `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`;
    expect(() =>
      execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '--eval',
          `const entry = await import(${JSON.stringify(url)}); if (typeof entry.default !== 'function') process.exit(1);`,
        ],
        { stdio: 'pipe' },
      ),
    ).not.toThrow();
  });

  it('要求密钥并把有效请求转给固定上游', async () => {
    const upstream = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{"model":"jev-latest","answers":{}}', { status: 200 }));
    const payload =
      '{"state":"hello","questions":{"urgent":{"type":"noul","instructions":"urgent?"}}}';
    expect((await callFunction(payload)).status).toBe(400);
    const result = await callFunction(payload, 'Bearer secret-key');
    expect(result.status).toBe(200);
    expect(JSON.parse(result.body)).toMatchObject({ model: 'jev-latest' });
    expect(upstream).toHaveBeenCalledWith(
      'https://api.typesafe.ai/v1/systemone',
      expect.objectContaining({ method: 'POST', redirect: 'manual' }),
    );
    expect(String(upstream.mock.calls[0][1]?.body)).not.toContain('secret-key');
  });

  it('不把上游重定向或密钥泄漏给调用方', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 307, headers: { Location: 'https://example.com/leak' } }),
    );
    const result = await callFunction('{"state":"hello","questions":{}}', 'Bearer secret-key');
    expect(result.status).toBe(502);
    expect(result.location).toBeUndefined();
    expect(result.body).not.toContain('secret-key');
  });
});

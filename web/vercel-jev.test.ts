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
    expect(upstream.mock.calls[0][1]?.headers).not.toHaveProperty('TypeSafe-Danger-Zone-Images');
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

it('转发图片和实验头，拒绝未引用或无效 assets', async () => {
  const upstream = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
  const payload = {
    state: { image: 'image-uuid' },
    questions: { a: { type: 'noul', instructions: 'cat?' } },
    assets: { 'image-uuid': { type: 'image', format: 'png', data_base64: 'iVBORw0KGgo=' } },
    endpoint: 'https://evil.example',
  };
  expect((await callFunction(JSON.stringify(payload), 'Bearer key')).status).toBe(200);
  expect(upstream.mock.calls[0][0]).toBe('https://api.typesafe.ai/v1/systemone');
  expect(upstream.mock.calls[0][1]?.headers).toMatchObject({
    'TypeSafe-Danger-Zone-Images': 'true',
  });
  expect(JSON.parse(String(upstream.mock.calls[0][1]?.body)).assets).toEqual(payload.assets);
  for (const invalid of [
    { ...payload, state: 'unreferenced' },
    { ...payload, assets: { 'image-uuid': { url: 'https://evil.example/image' } } },
    {
      ...payload,
      assets: {
        'image-uuid': { type: 'image', format: 'png', data_base64: 'data:image/png;base64,abc' },
      },
    },
  ]) {
    expect((await callFunction(JSON.stringify(invalid), 'Bearer key')).status).toBe(400);
  }
  expect(upstream).toHaveBeenCalledTimes(1);
});

it('图片仅在指令或 criteria 引用也可发送，拒绝仅出现在键中的引用', async () => {
  const upstream = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
  const assets = { 'image-uuid': { type: 'image', format: 'png', data_base64: 'iVBORw0KGgo=' } };
  for (const question of [
    { type: 'noul', instructions: 'look at image-uuid now' },
    { type: 'choice', instructions: 'match?', criteria: { yes: 'image-uuid', no: 'other' } },
  ]) {
    expect(
      (
        await callFunction(
          JSON.stringify({ state: 'text', questions: { a: question }, assets }),
          'Bearer key',
        )
      ).status,
    ).toBe(200);
  }
  expect(
    (
      await callFunction(
        JSON.stringify({
          state: { 'image-uuid': 'x' },
          questions: { a: { type: 'noul', instructions: 'look' } },
          assets,
        }),
        'Bearer key',
      )
    ).status,
  ).toBe(400);
  expect(upstream).toHaveBeenCalledTimes(2);
});
it('图片超出总量、数量或请求大小时不发送上游', async () => {
  const upstream = vi.spyOn(globalThis, 'fetch');
  const bytes = Buffer.alloc(65536);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  const asset = { type: 'image', format: 'png', data_base64: bytes.toString('base64') };
  const payload = {
    state: 'a b c d e',
    questions: { a: { type: 'noul', instructions: 'look' } },
    assets: { a: asset, b: asset, c: { ...asset, data_base64: 'iVBORw0KGgo=' } },
  };
  expect((await callFunction(JSON.stringify(payload), 'Bearer key')).status).toBe(400);
  expect(
    (
      await callFunction(
        JSON.stringify({
          ...payload,
          assets: { a: asset, b: asset, c: asset, d: asset, e: asset },
        }),
        'Bearer key',
      )
    ).status,
  ).toBe(413);
  expect(upstream).not.toHaveBeenCalled();
});

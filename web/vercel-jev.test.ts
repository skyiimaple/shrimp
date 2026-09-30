// @vitest-environment node
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, request as httpRequest } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { execPath } from 'node:process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from './api/jev/evaluate';

const webRoot = dirname(fileURLToPath(import.meta.url));

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

function transpileForNodeEsm(source: string, fileName: string): string {
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  return outputText;
}

describe('Vercel Jev Function', () => {
  it('编译后的 ESM 能解析 local-proxy.js', async () => {
    const root = await mkdtemp(join(tmpdir(), 'jev-fn-'));
    try {
      await writeFile(join(root, 'package.json'), '{"type":"module"}\n');
      for (const relativePath of ['local-proxy.ts', 'api/jev/evaluate.ts']) {
        const source = await readFile(join(webRoot, relativePath), 'utf8');
        const outputPath = join(root, relativePath.replace(/\.ts$/, '.js'));
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, transpileForNodeEsm(source, relativePath));
      }
      const emitted = await readFile(join(root, 'api/jev/evaluate.js'), 'utf8');
      expect(emitted).toContain("from '../../local-proxy.js'");
      await new Promise<void>((resolve, reject) => {
        const child = spawn(
          execPath,
          ['--input-type=module', '-e', "await import('./api/jev/evaluate.js')"],
          { cwd: root },
        );
        let stderr = '';
        child.stderr.on('data', (chunk: Buffer) => {
          stderr += chunk.toString();
        });
        child.on('error', reject);
        child.on('exit', (code) => {
          if (code === 0) resolve();
          else reject(new Error(stderr || `node exited ${code}`));
        });
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
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

// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { build, preview, type PreviewServer } from 'vite';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';

let output: string;
let server: PreviewServer;
let origin: string;
let directory: string;
let shards: string[];
beforeAll(async () => {
  output = await mkdtemp(join(process.cwd(), '.mac-delivery-'));
  await build({
    configFile: join(process.cwd(), 'vite.config.ts'),
    logLevel: 'silent',
    build: { outDir: output, emptyOutDir: false },
  });
  const versions = await readdir(join(output, 'assets/mac-vendors'));
  expect(versions).toHaveLength(1);
  directory = `assets/mac-vendors/${versions[0]}/`;
  shards = (await readdir(join(output, directory))).filter((file) =>
    /^[0-9A-F]{3,4}\.json$/.test(file),
  );
  server = await preview({
    configFile: join(process.cwd(), 'vite.config.ts'),
    logLevel: 'silent',
    build: { outDir: output },
    preview: { host: '127.0.0.1', port: 0 },
  });
  origin = `http://127.0.0.1:${(server.httpServer.address() as AddressInfo).port}`;
}, 30_000);
afterAll(async () => {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server.httpServer.close((error) => (error ? reject(error) : resolve())),
    );
  if (output) await rm(output, { recursive: true, force: true });
});
describe('MAC production delivery', () => {
  it('emits every manifest shard and the complete offline snapshot with identical records', async () => {
    expect(shards).toHaveLength(1178);
    const full = JSON.parse(await readFile(join(output, directory, 'offline.json'), 'utf8'));
    const entries = await Promise.all(
      shards.map(async (file) => {
        const text = await readFile(join(output, directory, file), 'utf8');
        expect(Buffer.byteLength(text)).toBeLessThan(25_000);
        const data = JSON.parse(text);
        expect(Object.keys(data).every((key) => key.startsWith(file.replace('.json', '')))).toBe(
          true,
        );
        return data;
      }),
    );
    expect(Object.assign({}, ...entries)).toEqual(full);
    expect(Object.keys(full)).toHaveLength(40283);
    expect(await readFile(join(output, directory, 'LICENSE.txt'), 'utf8')).toContain('silverwind');
    const bundles = await readdir(join(output, 'assets'));
    const card = bundles.find((file) => /^parity-mac-vendor-tool-panel-.*\.js$/.test(file))!;
    expect((await readFile(join(output, 'assets', card))).length).toBeLessThan(20_000);
  });
  it('serves real production JSON with immutable caching, not the SPA fallback', async () => {
    for (const file of ['0000.json', '001D.json', 'offline.json']) {
      const response = await fetch(`${origin}/${directory}${file}`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
      expect(response.headers.get('cache-control')).toContain('max-age=31536000');
      expect(response.headers.get('cache-control')).toContain('immutable');
      expect(await response.json()).toHaveProperty(file === '001D.json' ? '001D00' : '00000C');
    }
    const missing = await fetch(`${origin}/${directory}missing.json`);
    expect(missing.headers.get('cache-control')).not.toContain('immutable');
  });
  it('maps every emitted data URL to immutable Vercel headers and keeps it out of SPA rewrites', async () => {
    const config = JSON.parse(await readFile(join(process.cwd(), 'vercel.json'), 'utf8'));
    for (const file of [...shards, 'offline.json']) {
      const path = `/${directory}${file}`;
      const policy = (config.headers ?? []).find((item: { source: string }) =>
        new RegExp(`^${item.source}$`).test(path),
      );
      expect(
        policy?.headers.find((item: { key: string }) => item.key.toLowerCase() === 'cache-control')
          ?.value,
      ).toBe('public, max-age=31536000, immutable');
      expect(
        config.rewrites.some((item: { source: string }) =>
          new RegExp(`^${item.source}$`).test(path),
        ),
      ).toBe(false);
    }
    expect(
      config.rewrites.some((item: { source: string }) =>
        new RegExp(`^${item.source}$`).test('/tools/mac-vendor'),
      ),
    ).toBe(true);
  });
});

import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { Plugin } from 'vite';

export function createMacVendorAssets(vendors: Record<string, string>, limit = 24_000) {
  const records = Object.fromEntries(
    Object.entries(vendors).filter(([key]) => /^[0-9A-F]{6}$/.test(key)),
  );
  const buckets: Record<string, Record<string, string>> = {};
  for (const [key, value] of Object.entries(records))
    (buckets[key.slice(0, 3)] ??= {})[key] = value;
  const shards: typeof buckets = {};
  for (const [prefix, entries] of Object.entries(buckets)) {
    if (Buffer.byteLength(JSON.stringify(entries)) <= limit) shards[prefix] = entries;
    else
      for (const [key, value] of Object.entries(entries))
        (shards[key.slice(0, 4)] ??= {})[key] = value;
  }
  const hash = createHash('sha256').update(JSON.stringify(records)).digest('hex').slice(0, 16);
  return { records, shards, directory: `assets/mac-vendors/${hash}/` };
}

export function macVendorAssetsPlugin(): Plugin {
  const require = createRequire(import.meta.url);
  const sourcePath = require.resolve('oui-data');
  const assets = createMacVendorAssets(JSON.parse(readFileSync(sourcePath, 'utf8')));
  const files = new Map(
    Object.entries(assets.shards).map(([prefix, data]) => [
      `${assets.directory}${prefix}.json`,
      JSON.stringify(data),
    ]),
  );
  files.set(`${assets.directory}offline.json`, JSON.stringify(assets.records));
  files.set(
    `${assets.directory}LICENSE.txt`,
    readFileSync(join(dirname(sourcePath), 'LICENSE'), 'utf8'),
  );
  const virtual = 'virtual:mac-vendor-assets';
  let base = '/';
  return {
    name: 'mac-vendor-assets',
    configResolved(config) {
      base = config.base;
    },
    resolveId(id) {
      if (id === virtual) return `\0${virtual}`;
    },
    load(id) {
      if (id === `\0${virtual}`)
        return `export const directory = import.meta.env.BASE_URL + ${JSON.stringify(assets.directory)}; export const prefixes = ${JSON.stringify(Object.keys(assets.shards).join(','))}.split(',');`;
    },
    generateBundle() {
      for (const [fileName, source] of files) this.emitFile({ type: 'asset', fileName, source });
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
        const file = pathname.startsWith(base) ? pathname.slice(base.length) : '';
        const source = files.get(file);
        if (!source) {
          next();
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=31536000, immutable',
        });
        res.end(source);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
        const file = pathname.startsWith(base) ? pathname.slice(base.length) : '';
        if (!files.has(file)) {
          next();
          return;
        }
        let source: Buffer;
        try {
          source = readFileSync(resolve(server.config.root, server.config.build.outDir, file));
        } catch {
          next();
          return;
        }
        res.writeHead(200, {
          'Content-Type': file.endsWith('.json') ? 'application/json' : 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Length': source.length,
        });
        res.end(req.method === 'HEAD' ? undefined : source);
      });
    },
  };
}

import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

const ASSET_NAMES = [
  'pyodide.asm.js',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
] as const;
const JAVASCRIPT_WORKER_CSP =
  "default-src 'none'; script-src 'self' 'unsafe-eval'; connect-src 'none'; worker-src 'self'; object-src 'none'; base-uri 'none'";
const PYTHON_WORKER_CSP =
  "default-src 'none'; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'";

export function pyodideAssetsPlugin(): Plugin {
  const packageDirectory = resolve(process.cwd(), 'node_modules/pyodide');
  let command: 'build' | 'serve' = 'build';

  return {
    name: 'pyodide-assets',
    configResolved(config) {
      command = config.command;
    },
    buildStart() {
      if (command === 'serve') return;
      for (const name of ASSET_NAMES) {
        const source = resolve(packageDirectory, name);
        if (!existsSync(source)) throw new Error(`Pyodide asset is missing: ${source}`);
        this.emitFile({
          type: 'asset',
          fileName: `pyodide/${name}`,
          source: readAsset(source),
        });
      }
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestPath = request.url?.split('?')[0] ?? '';
        if (requestPath.endsWith('/runtime-javascript-worker.ts'))
          response.setHeader('Content-Security-Policy', JAVASCRIPT_WORKER_CSP);
        if (requestPath.endsWith('/runtime-python-worker.ts'))
          response.setHeader('Content-Security-Policy', PYTHON_WORKER_CSP);
        next();
      });
      server.middlewares.use('/pyodide', (request, response, next) => {
        const requestPath = request.url?.split('?')[0]?.replace(/^\//, '') ?? '';
        if (!ASSET_NAMES.includes(requestPath as (typeof ASSET_NAMES)[number])) {
          next();
          return;
        }
        const source = resolve(packageDirectory, requestPath);
        response.setHeader(
          'Content-Type',
          requestPath.endsWith('.wasm')
            ? 'application/wasm'
            : requestPath.endsWith('.zip')
              ? 'application/zip'
              : requestPath.endsWith('.js')
                ? 'text/javascript; charset=utf-8'
                : 'application/json',
        );
        response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        createReadStream(source).pipe(response);
      });
    },
  };
}

function readAsset(source: string) {
  return readFileSync(source);
}

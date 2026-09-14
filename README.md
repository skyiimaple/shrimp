# shrimp

Single-node self-host skeleton. This slice lands compose + the HTTP contract only.

- [`docker-compose.yml`](./docker-compose.yml) — `ui` (Open WebUI), `runtime` (placeholder on `:8080`), `db` (SQLite on host `./data`). Postgres is a later option; not in v1.
- [`docs/openapi.yaml`](./docs/openapi.yaml) — OpenAPI 3.0.3 for agents, sync chat, routines, and the search tool.
- [`apps/web`](./apps/web) — 可替换侧栏聊天草图（Next.js App Router）。走 native OpenAPI，不调用 `/v1`，也不替换 compose 里的 Open WebUI `ui`。

A mock runtime that actually serves the OpenAPI is a follow-up PR. Auth, scheduler, and a second admin UI are out of scope here.

## Web shell（草图）

```bash
cd apps/web
pnpm install
pnpm dev
```

默认 `http://localhost:3001` → runtime `http://localhost:8080`。`NEXT_PUBLIC_API_BASE` 可覆盖 API 地址。runtime 未起时，页面上打开「本地 Mock（仅本机）」即可点选：CreateAgent → 切换 → 同步 chat。详见 [`apps/web/README.md`](./apps/web/README.md)。

Compose 不变：`ui` 仍是 Open WebUI。本壳用 `pnpm dev` 跑，不作为产品双 UI。

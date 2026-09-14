# shrimp

[中文](README.md) | [English](README.en.md)

China-focused self-host multi-agent: sidebar multi-bot, cron routines, private/local data.

**First slice:** CreateAgent → chat → one cron → one tool (search).

**Stack:** single-node Docker — `ui` (Open WebUI) → `runtime` → SQLite + host [`./data`](./data).

- [`docker-compose.yml`](./docker-compose.yml) — compose
- [`docs/openapi.yaml`](./docs/openapi.yaml) — HTTP contract

Auth is deferred. Runtime owns the mock and `/v1` OpenAI facade (for Open WebUI).


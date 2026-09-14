# shrimp

## 中文

面向国内自托管的多 Agent：侧栏多机器人、cron 例行任务、数据私有本地。

**首片：** CreateAgent → 对话 → 一条 cron → 一个工具（search）。

**栈：** 单机 Docker — `ui`（Open WebUI）→ `runtime` → SQLite + 主机 [`./data`](./data)。

- [`docker-compose.yml`](./docker-compose.yml) — 编排
- [`docs/openapi.yaml`](./docs/openapi.yaml) — HTTP 契约

鉴权延后。mock / 真实 runtime 为后续 PR。`/v1` OpenAI 门面由 runtime 后续提供。

## English

China-focused self-host multi-agent: sidebar multi-bot, cron routines, private/local data.

**First slice:** CreateAgent → chat → one cron → one tool (search).

**Stack:** single-node Docker — `ui` (Open WebUI) → `runtime` → SQLite + host [`./data`](./data).

- [`docker-compose.yml`](./docker-compose.yml) — compose
- [`docs/openapi.yaml`](./docs/openapi.yaml) — HTTP contract

Auth is deferred. Mock / real runtime is a follow-up PR. The `/v1` OpenAI facade is owned by runtime later.

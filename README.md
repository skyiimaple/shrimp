# shrimp

[中文](README.md) | [English](README.en.md)

面向国内自托管的多 Agent：侧栏多机器人、cron 例行任务、数据私有本地。

**首片：** CreateAgent → 对话 → 一条 cron → 一个工具（search）。

**栈：** 单机 Docker — `ui`（Open WebUI）→ `runtime` → SQLite + 主机 [`./data`](./data)。

- [`docker-compose.yml`](./docker-compose.yml) — 编排
- [`docs/openapi.yaml`](./docs/openapi.yaml) — HTTP 契约

鉴权延后。runtime 提供 mock 与 `/v1` OpenAI 门面（喂 Open WebUI）。


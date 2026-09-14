# shrimp web shell

可替换的侧栏 + 聊天草图。只打 `docs/openapi.yaml` 的四类资源（agents / chat / routines / `/tools/search`），**不调用** `/v1/*`。Compose 里的 Open WebUI `ui` 服务保持不动。

## 开发

需要本机 Node。runtime 可有可无：没有 runtime 时打开页面上的「本地 Mock」。

```bash
cd apps/web
npm install   # 或 pnpm install
npm run dev   # 或 pnpm dev
```

浏览器打开终端里打印的地址（默认 `http://localhost:5173`）。

默认 API：`http://localhost:8080`。换 runtime 地址：

```bash
VITE_API_BASE=http://localhost:8080 npm run dev
```

或复制 `.env.example` 为 `.env`。

## 演示路径

1. 勾选「本地 Mock」，或先起 runtime（见仓库根 README / 后续 runtime PR）。
2. 点侧栏 `+`，填 `name` + `persona`，创建智能体。
3. 切换智能体：每个有独立 `conversation_id` 与消息列表。
4. 发送一条消息 → `POST /agents/{id}/chat`（同步一轮）。

Routines / search 只在 `src/api` 里有 client helper，本草图没有例行任务状态条。

## English

Thin swappable chat shell (Vite + React). Native shrimp paths only, not `/v1`. Leave compose `ui` (Open WebUI) as-is. `npm install && npm run dev`; optional `VITE_API_BASE`; in-page **local mock** when runtime is down.

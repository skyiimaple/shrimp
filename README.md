# Shrimp 工具箱

本地运行的中文开发者工具箱。界面按开发者工具的信息密度来排（密度参考 IT-Tools，品牌与页面独立），JSON、编解码、哈希等工具在浏览器内完成，HTTP 请求经本机受约束代理发出。

## 目录结构

```text
web/       React 19 + Vite + TypeScript + Tailwind CSS 4，包管理器为 pnpm
           路由与请求使用 TanStack Router、TanStack Query
server/    Spring Boot 3 + Java 21，构建入口是 Gradle Wrapper（server/gradlew）
docs/superpowers/specs/    设计规格
docs/superpowers/plans/    实施计划
```

前后端分开构建。收藏和主题只保存在浏览器 `localStorage`。

当前前端工具：JSON、Base64、JWT 解码、文本哈希、时间戳、UUID、Cron、正则表达式，以及 HTTP 请求。

## 环境要求

- **Node.js** 20.19+，或 22.12+。`web` 依赖 Vite 7，其 `engines.node` 为 `^20.19.0 || >=22.12.0`。
- **pnpm** 10。`web/package.json` 的 `packageManager` 为 `pnpm@10.17.1`。
- **Java** 21。`server/build.gradle.kts` 用 toolchain 固定语言版本；Gradle Wrapper 为 8.14.3。

## 本地启动

先起后端，再起前端。HTTP 请求工具依赖本机代理；其余工具只在浏览器里运行。

```bash
cd server
./gradlew bootRun
```

服务按 `server/src/main/resources/application.yml` 绑定 `127.0.0.1:8080`。

另开一个终端：

```bash
cd web
pnpm install
pnpm dev
```

Vite 开发服务器默认在 <http://localhost:5173>，并把 `/api` 代理到 `http://127.0.0.1:8080`。

## 常用命令

在 `web/`：

- `pnpm test`：Vitest。交互终端里默认监听；跑完即退用 `pnpm test -- --run`。
- `pnpm build`：`tsc -b && vite build`。
- `pnpm typecheck`：`tsc -b --pretty false`。

在 `server/`：

- `./gradlew test`：JUnit 5 测试。
- `./gradlew bootRun`：启动应用。

仓库里的构建入口是 `server/gradlew`。设计规格和实施计划正文仍写 Maven Wrapper，启动和测试以本文的 Gradle 命令为准。

## 安全说明

HTTP 代理只给本机用。

- Spring Boot 只监听 `127.0.0.1`，端口 `8080`。保持回环地址，避免把该进程暴露到局域网或公网。
- 代理入口是 `POST /api/http/send`。
- 只接受 `http` 与 `https`。带用户信息或片段的 URL、非法端口、无法解析的主机会被拒绝。
- 允许本机、常见局域网和公网目标。拒绝链路本地地址，以及常见云厂商元数据主机名（AWS、GCP、Azure、阿里云、腾讯云）。每次连接前检查解析到的全部地址，任一命中即拒绝。
- 重定向不会自动放行。每一跳重新解析并做同样的校验，默认最多 5 次（`shrimp.proxy.max-redirects`）。
- 默认整次请求超时 10 秒（`shrimp.proxy.timeout`），响应体上限 2 MiB（`shrimp.proxy.max-response-bytes: 2097152`）。超出上限会停止读取并返回统一错误。
- 调用方不能覆盖 `Host`、`Content-Length` 等逐跳或敏感传输头。代理不记录请求或响应 Body。

## 首版范围

首版没有账户、云同步、数据库，也不做在线部署。Web 留在本机使用，不部署到公网。

## 文档

- 设计规格：[docs/superpowers/specs/2026-09-28-shrimp-toolbox-design.md](docs/superpowers/specs/2026-09-28-shrimp-toolbox-design.md)
- 实施计划：[docs/superpowers/plans/2026-09-28-shrimp-toolbox.md](docs/superpowers/plans/2026-09-28-shrimp-toolbox.md)

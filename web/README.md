# Shrimp Web

Shrimp 工具箱的前端。JSON、编解码、哈希、周报等工具在浏览器内完成；HTTP 请求经本机 `server` 代理发出。收藏和主题只写在浏览器 `localStorage`，没有账户和云同步。

技术栈：React 19、Vite 7、TypeScript、Tailwind CSS 4、TanStack Router、TanStack Query。包管理器是 pnpm。

## 环境要求

- Node.js 20.19+，或 22.12+。
- pnpm 10。本目录 `package.json` 的 `packageManager` 为 `pnpm@10.17.1`。

使用 HTTP 请求工具时，先在 `../server` 启动后端。其余工具不依赖后端。

## 本地启动

```bash
pnpm install
pnpm dev
```

开发服务器默认在 <http://localhost:5173>。`vite.config.ts` 把 `/api` 代理到 `http://127.0.0.1:8080`。

## 常用命令

- `pnpm test`：Vitest。交互终端里默认监听；跑完即退用 `pnpm test -- --run`。
- `pnpm build`：`tsc -b && vite build`。
- `pnpm typecheck`：`tsc -b --pretty false`。

## 目录结构

页面从 `index.html` 进入 `src/main.tsx`，再由 `src/app.tsx` 套上请求缓存、主题和收藏。路由只有两个：`/` 是首页，`/tools/$slug` 是工具页。首页搜索、分类卡片和工具页都读 `src/tools/registry.ts`，不另维护一份导航。

```text
web/
  index.html                      页面壳，挂载 #root
  package.json                    依赖与 pnpm 脚本
  pnpm-lock.yaml                  锁定依赖版本
  vite.config.ts                  Tailwind、/api 开发代理、Vitest
  tsconfig.json                   TypeScript 工程引用
  tsconfig.app.json               应用的 TypeScript 编译选项
  components.json                 shadcn/ui 的样式和别名约定
  src/
    main.tsx                      把应用挂到 #root
    app.tsx                       QueryClient、主题、收藏、路由
    router.tsx                    / 与 /tools/$slug
    styles.css                    Tailwind 与页面样式
    routes/
      index.tsx                   首页：搜索、收藏、按分类列出工具
      tool.tsx                    工具页：标题、简介、收藏和操作区
    components/
      app-shell.tsx               顶栏、主题切换和页面框架
      tool-card.tsx               首页上的一张工具卡片
      ui.tsx                      按钮、输入框、卡片等基础控件
    features/
      favorites/                  收藏集合，以及 localStorage 读写
      theme/                      浅色、深色或跟随系统，偏好存在本地
      http/                       浏览器里调用 POST /api/http/send
    lib/
      utils.ts                    合并 className、复制文本
    tools/
      registry.ts                 工具名称、分类、关键词、图标和面板组件
      types.ts                    ToolDefinition 等类型
      lib/                        不依赖界面的转换函数，一种工具一个文件
        json.ts base64.ts jwt.ts hash.ts
        timestamp.ts uuid.ts cron.ts regex.ts
        weekly-report.ts
        result.ts                 成功或错误的统一返回
      components/
        tool-panels.tsx           JSON、编解码、哈希、时间、UUID、Cron、正则、HTTP 的面板
        weekly-report-tool.tsx    周报面板：选产品、选成员、粘贴表格
    test/
      setup.ts                    Vitest 的 jsdom 环境
```

测试文件和被测代码放在一起，文件名是 `*.test.ts` 或 `*.test.tsx`。新增工具时补三处：`tools/lib` 里的转换函数、`tools/components` 里的面板，以及 `registry.ts` 里的一项。slug 必须等于 `/tools/:slug` 的最后一段。

## 当前工具

| 分类 | 工具 |
|------|------|
| 数据处理 | JSON、文本哈希 |
| 编码转换 | Base64、JWT 解码（只看 Header 与 Payload，不验证签名） |
| 日期时间 | 时间戳 |
| 开发辅助 | UUID、Cron、正则表达式、周报生成 |
| 网络工具 | HTTP 请求 |

周报生成读取制表符分隔的表格行，按所选产品和成员整理团队与个人周报。HTTP 请求调用 `POST /api/http/send`；后端未启动时页面会提示无法连接本地代理。

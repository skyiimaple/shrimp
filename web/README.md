# Shrimp Web

Shrimp 工具箱的前端。JSON、编解码、哈希、周报等工具在浏览器内完成；HTTP 请求经本机 `server` 代理发出。Jev 试炼场通过本目录的 Vite 本地转发调用 TypeSafe AI。收藏、主题和 Jev API Key 写在当前浏览器的 `localStorage`，没有账户和云同步。

技术栈：React 19、Vite 7、TypeScript、Tailwind CSS 4、TanStack Router、TanStack Query。包管理器是 pnpm。

## 环境要求

- Node.js 20.19+，或 22.12+。
- pnpm 10。本目录 `package.json` 的 `packageManager` 为 `pnpm@10.17.1`。

使用 HTTP 请求工具时，先在 `../server` 启动后端。Jev 工具使用 `web/` 内的 Vite 本地转发，不依赖 Java 服务。

## 本地启动

```bash
pnpm install
pnpm dev
```

开发服务器默认在 <http://localhost:5173>。`vite.config.ts` 把普通 `/api` 请求代理到 `http://127.0.0.1:8080`；`/api/jev/evaluate` 则由本目录的 `local-proxy.ts` 固定转发到 TypeSafe API。`pnpm build && pnpm exec vite preview` 同样提供 Jev 转发。

## 部署到 Vercel

导入仓库时，将项目的 **Root Directory** 设为 `web`。本目录的 `vercel.json` 指定 Vite 构建、`dist` 输出和单页应用路由；`api/jev/evaluate.ts` 会作为 Vercel Function 提供同源的 Jev 接口。前端调用地址与本地开发一致，不需要 Java 服务或 API Key 环境变量；用户在浏览器输入自己的 Key。

`HTTP 请求` 工具仍依赖单独的 Java 后端，当前 Vercel 配置只承接 Jev。若将 `dist/` 放到 Vercel 以外的纯静态服务器，仍需由该部署环境提供 `/api/jev/evaluate` 同源接口。

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
  local-proxy.ts                  Jev 专用本地转发，固定上游且不跟随重定向
  vercel.json                     Vercel Vite 构建和单页应用路由
  api/jev/evaluate.ts             Vercel 上的 Jev Function
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
      jev/                        Jev 密钥、请求编辑、客户端和试炼场界面
    lib/
      utils.ts                    合并 className、复制文本
    tools/
      registry.ts                 工具名称、分类、关键词、图标和面板组件
      types.ts                    ToolDefinition 等类型
      lib/                        不依赖界面的转换函数，按领域拆分
        json.ts base64.ts jwt.ts hash.ts
        timestamp.ts uuid.ts cron.ts regex.ts
        structured-data.ts       YAML、JSON、TOML 转换
        encoding.ts              URL 与整数进制转换
        text-processing.ts       大小写与列表处理
        markdown.ts sql.ts        安全 Markdown 与 SQL 排版
        password.ts color.ts user-agent.ts  密码、颜色与 UA 处理
        weekly-report.ts
        result.ts                 成功或错误的统一返回
      components/
        tool-panels.tsx           JSON、编解码、哈希、时间、UUID、Cron、正则、HTTP 的面板
        structured-data-tool-panels.tsx  YAML/JSON、JSON/TOML 面板
        text-tool-panels.tsx      URL、大小写、列表面板
        developer-tool-panels.tsx 进制转换面板
        second-batch-tool-panels.tsx  Markdown、SQL、密码、颜色、UA 面板
        weekly-report-tool.tsx    周报面板：选产品、选成员、粘贴表格
    test/
      setup.ts                    Vitest 的 jsdom 环境
```

测试文件和被测代码放在一起，文件名是 `*.test.ts` 或 `*.test.tsx`。新增工具时补三处：`tools/lib` 里的转换函数、`tools/components` 里的面板，以及 `registry.ts` 里的一项。slug 必须等于 `/tools/:slug` 的最后一段。

## 当前工具

| 分类     | 工具                                                   |
| -------- | ------------------------------------------------------ |
| 数据处理 | JSON、YAML ⇄ JSON、JSON ⇄ TOML、文本大小写、列表处理、文本哈希、Markdown 转 HTML、颜色转换 |
| 编码转换 | Base64、URL 编解码、进制转换、JWT 解码（只看 Header 与 Payload，不验证签名） |
| 日期时间 | 时间戳                                                 |
| 开发辅助 | UUID、Cron、正则表达式、周报生成、SQL 格式化、密码生成、Jev 调用试炼场 |
| 网络工具 | HTTP 请求、User-Agent 解析                            |

周报生成读取制表符分隔的表格行，按所选产品和成员整理团队与个人周报。HTTP 请求调用 `POST /api/http/send`；后端未启动时页面会提示无法连接本地代理。

Markdown 工具先清理危险 HTML，再展示生成的 HTML 与预览。SQL 工具只排版文本，不连接数据库或执行语句。密码工具通过浏览器安全随机源生成，也支持手动输入并分析强度；密码不会写入本地存储或发送给服务端。

Jev 试炼场第一次打开时输入 API Key，随后可更换或清除。密钥以明文保存在当前浏览器的 `localStorage`，请求预览和结果中不包含密钥；调用时经本地转发发送至 TypeSafe AI。state 和问题内容也会发送至 TypeSafe AI。支持在一个请求中编辑多个 Noul、Choice、Score 问题，并展示答案、概率、置信度、用量和原始响应。

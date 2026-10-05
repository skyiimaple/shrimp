# Shrimp Web

Shrimp 工具箱的前端。JSON、编解码、哈希、周报等工具在浏览器内完成；HTTP 请求经本机 `server` 代理发出。Jev 试炼场通过本目录的 Vite 本地转发调用 TypeSafe AI。顶部栏的 Agent 聊天由浏览器直连 DeepSeek 或 GLM；收藏、主题、模型 API Key 等设置写在当前浏览器的 `localStorage`，唯一一份聊天记录写在 IndexedDB，没有账户和云同步。

技术栈：React 19、Vite 7、TypeScript、Tailwind CSS 4、TanStack Router、TanStack Query。包管理器是 pnpm。

## 环境要求

- Node.js 20.19+，或 22.12+。
- pnpm 10。本目录 `package.json` 的 `packageManager` 为 `pnpm@10.17.1`。

使用 HTTP 请求工具时，先在 `../server` 启动后端。工具页会通过 `GET /api/http/status` 显示本地代理状态与当前限制；未连接时可手动重新检测，发送按钮暂不可用。Jev 工具使用 `web/` 内的 Vite 本地转发，不依赖 Java 服务。

Agent 聊天也不依赖 Java 服务：在顶部栏打开弹窗，选择 DeepSeek 或 GLM，输入自己在对应平台申请的 API Key。Key 以明文保存在当前浏览器的 `localStorage`，只会随请求发送给所选模型服务；请仅在可信设备使用。聊天历史在同一浏览器中持续保留，除非手动确认清空或清除浏览器数据。清空聊天不会删除 Key；在设置中可单独删除当前服务商 Key。模型每轮只接收近期消息，不能依赖它记住全部旧记录。

第一版 Agent 仅能调用 JSON、Base64、时间戳、UUID、正则五项浏览器本地工具，不会调用 HTTP 代理或执行模型生成的代码。浏览器直连依赖模型平台的跨域策略；若出现网络或跨域错误，请检查浏览器开发者工具。`web/.env` 不会给聊天功能自动注入 Key，用户需在界面输入。

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
      agent/                      顶栏聊天弹窗、单份历史、模型流与五个本地工具
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

### MAC 厂商数据加载

MAC 厂商查询不使用外部在线 API。构建插件 `build/mac-vendor-assets.ts` 从锁定的 `oui-data` 生成带内容哈希的本站 JSON 数据：一般按三位十六进制前缀分片，大分片再拆为四位。只保留原工具实际查询的 24 位 OUI，查询语义不变。

打开卡片不下载厂商数据；有效查询只读取一个分片，未知分片不发请求。同一分片合并并发请求，失败可重试；已查分片在浏览器支持 CacheStorage 时持久缓存。点击“下载完整离线数据库”只下载一个完整 JSON 并缓存，之后已打开的工具可离线查询所有前缀。站点存储被禁用或空间不足时明确提示，清除站点缓存后需重新下载；这不是整个工具箱的 PWA 离线安装功能。

生产构建实测（字节；gzip 使用 Node 默认 gzip，同一口径；不含前后共用的框架资源）：旧 MAC 卡片 JS 为 5,427,920 / gzip 1,820,073；优化后约 8.8 KB / gzip 4.7 KB。Cisco `00:00:0C:12:34:56` 的分片为 20,815 / gzip 8,064，首次打开并完成该查询合计约 29.6 KB / gzip 12.7 KB，压缩资源量减少约 99.3%。共 1,178 个分片，最大 24,008 字节；完整离线库为 4,043,498 / gzip 1,221,487。以上是产物大小和加载范围，不是浏览器解析耗时测量。

### 联网查询接口

- IP 查询、DNS 查询：`GET /api/network/lookup`。
- RDAP / WHOIS、HTTP 响应头、GitHub 仓库、npm 包：`GET /api/network/public-tools`。

这些接口在 `web/api/network/` 内实现，Vite 开发/预览和以 `web/` 为 Root Directory 的 Vercel 部署都可使用，不依赖 Java 服务，也不需要配置密钥。查询内容会发给对应第三方服务；匿名额度由服务提供方限制，可能在部署实例之间共享。

HTTP 响应头工具只发 HEAD 请求，支持公网 HTTPS 默认端口，最多跟随三次重定向；不发送用户 Cookie/Authorization，也不返回 Set-Cookie。每跳解析并校验全部地址、将连接固定到已校验 IP，拒绝内网与保留地址。返回的是代理所在网络的响应，目标站点不支持 HEAD 时会如实展示其状态码。

本机代理使用 `198.18.0.0/15` Fake-IP 时，仅对全部解析结果均为该网段的域名通过 Cloudflare DoH 获取真实地址，再执行同样的公网校验与连接固定，不放行 Fake-IP。RDAP 可能缺少隐私字段或不支持部分后缀；没有 GitHub Release、无法获取 npm 下载量时显示“暂无数据”。

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

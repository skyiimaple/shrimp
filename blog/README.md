# Maple's Blog

与 `web/` 工具箱平级的独立 Vue 3 前端，UI 初版参考 [Fuwari](https://github.com/saicaca/fuwari) 的圆角卡片、侧栏与柔和配色。最终布局可继续调整，没有复制 Fuwari 的代码或图片。

## 运行

Node.js >=22，pnpm 10.17.1。在 `blog/` 目录运行：

```sh
pnpm install
pnpm dev
```

开发地址为 http://localhost:5174。验证与构建：

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm preview
```

交互控件使用官方 shadcn-vue（Reka UI）Button、Input 和 Select，位于 `src/components/ui/`。`components.json` 配置用于后续添加组件；主题变量统一映射到天空蓝配色。

## 结构

```text
blog/
├── public/                 # 本地封面、头像和文章图片
├── src/
│   ├── components/         # 导航、侧栏和文章卡片
│   ├── views/              # 首页、归档、关于、详情和 404
│   ├── router/             # 路由
│   ├── stores/             # 主题状态
│   ├── utils/              # Markdown 解析、筛选和渲染
│   ├── assets/             # 样式
│   ├── content/            # Markdown 文章
│   └── config.ts           # 站名、作者、封面、头像和主题色
└── vite.config.ts
```

## 个性化与写作

修改 `src/config.ts` 配置站名、作者、介绍、头像、封面和主题色。`toolboxUrl` 默认为空，填写工具箱真实网址后显示导航入口。

在 `src/content/` 新建 `my-post.md`，对应地址 `/posts/my-post`。文件开头包含：

```yaml
---
title: 我的文章
summary: 一句话介绍内容
date: '2026-10-08 12:00:00'
category: 开发记录
tags: [Vue, 前端]
---
```

发布时间使用北京时间，格式为 `YYYY-MM-DD HH:mm:ss`；文章列表和详情显示完整时间，并按发布时间降序排列。

之后写 Markdown 正文。支持标题目录、表格、引用、图片与常见语言代码高亮；HTML 经 DOMPurify 清理。文章元数据缺失、日期无效会报错，需修正后构建。图片放在 `public/images/`，正文使用 `/images/文件名.png`。站点文章在该目录维护，新增或删除 Markdown 文件即可更新文章列表。

## 部署

Vercel 项目根目录设为 `blog`，执行 `pnpm build`，输出 `dist`。已有 `vercel.json` 配置 SPA 回退。其他静态服务器也需将非静态资源路径回退到 `index.html`，以便直接打开文章地址。工具箱保持自己的运行与部署流程；无需 workspace。

当前版本是客户端渲染的静态 SPA，搜索和文章加载在浏览器中完成，尚未增加预渲染、RSS 或网页编辑后台。

### Vercel

导入当前 GitHub 仓库，新建博客项目，Root Directory 选择 `blog`，Framework 选择 Vite，Node.js 选择 22，Install Command 为 `pnpm install --frozen-lockfile`，Build Command 为 `pnpm build`，Output Directory 为 `dist`。使用根路径与 history 路由。现有 `blog/vercel.json` 提供文章直接访问所需的 SPA 回退。GitHub 集成会在推送后自动部署。

`*.test.ts` 仅保留本地，Git 忽略新增测试文件；构建产物不包含测试。

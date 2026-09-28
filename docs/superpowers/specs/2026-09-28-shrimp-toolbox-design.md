# Shrimp 工具箱设计规格

## 目标

在 `shrimp/` 中搭建一个面向中文用户的本地开发者工具箱。首版提供统一的工具注册、搜索、分类、收藏与工具详情体验，包含一批纯前端工具，并由本机 Spring Boot 服务提供受约束的 HTTP 代理。

## 范围

首版包含：

- 工具箱应用骨架与中文界面。
- 工具注册表、首页搜索、分类卡片、收藏与工具详情路由。
- JSON 格式化与校验、Base64 编解码、JWT 解码、文本哈希、时间戳转换、UUID 生成、Cron 解析、正则测试。
- HTTP 请求工具与本地 HTTP 代理。
- 浅色/深色主题。
- 前后端自动化测试、生产构建与使用文档。

首版不包含账户、云同步、数据库、JWT 签名验证、脚本执行、自定义插件机制、在线部署或服务端业务数据存储。

## 项目结构与技术栈

```text
shrimp/
  web/                 React 19 + Vite + TypeScript
  server/              Spring Boot 3 + Java 21
  docs/                设计与实施文档
  README.md             项目说明和本地启动方式
```

- 前端包管理器使用 pnpm。
- 样式使用 Tailwind CSS 4 与 shadcn/ui 组件约定，不使用 `tailwind.config.js`。
- 页面路由使用 TanStack Router。
- 服务端状态与 HTTP 请求使用 TanStack Query。
- 后端使用 Maven Wrapper 构建。
- 前后端保持独立构建，根目录文档提供统一操作入口。

## 视觉与交互

产品名为“Shrimp 工具箱”。视觉参考 IT-Tools 的信息密度，采用简洁、紧凑、偏开发者工具的界面，同时避免直接复制其品牌或页面。

- 支持浅色和深色主题，主题偏好保存到浏览器本地。
- 顶部导航包含品牌、收藏入口和主题切换。
- 首页先展示搜索，再展示收藏工具，随后按分类展示工具卡片。
- 搜索即时匹配工具名称、关键词、分类和简介。
- 桌面端为多列卡片，移动端为单列布局。
- 工具页路径为 `/tools/:slug`，包含面包屑、标题、简介、收藏按钮与工具操作区。
- 未知 slug 展示中文未找到状态，并提供返回首页操作。
- 表单控件具备可见标签、键盘焦点、足够的颜色对比度和明确的错误信息。

## 工具注册与页面结构

每个工具由统一注册项描述：

```ts
interface ToolDefinition {
  name: string
  slug: string
  path: `/tools/${string}`
  category: ToolCategory
  keywords: string[]
  description: string
  icon: LucideIcon
  component: ComponentType
}
```

首页、搜索、分类与工具详情都从同一注册表派生，避免重复维护导航和路由元数据。工具组件只负责自身输入、转换和输出，通用页面外壳负责标题、收藏与布局。

分类如下：

- 编码转换：Base64、JWT 解码。
- 数据处理：JSON、文本哈希。
- 日期时间：时间戳。
- 开发辅助：UUID、Cron、正则。
- 网络工具：HTTP 请求。

## 前端工具行为

### JSON

接受 JSON 文本，提供格式化、压缩和校验；错误显示中文描述和可定位时的行列信息。

### Base64

支持 UTF-8 文本的编码与解码，非法 Base64 输入给出错误，不静默产生乱码。

### JWT 解码

解析 Header 与 Payload，使用格式化 JSON 展示；不请求服务端、不验证签名，并在页面中持续显示安全提示。

### 文本哈希

使用 Web Crypto 计算 SHA-1、SHA-256、SHA-384 和 SHA-512，结果以十六进制显示。空文本允许计算。

### 时间戳

支持秒与毫秒时间戳、ISO 时间和本地日期时间互转，明确展示本地时间与 UTC 时间。

### UUID

使用浏览器安全随机源生成 UUID v4，支持批量生成与复制。

### Cron

解析标准五段 Cron 表达式，以中文描述含义并列出后续执行时间；非法表达式给出字段级错误。首版不支持 Quartz 秒/年字段。

### 正则

输入表达式、flags 和测试文本，展示所有匹配项及捕获组。非法表达式和不支持的 flag 给出中文错误。

### HTTP 请求

支持 URL、常用 HTTP 方法、自定义请求头和文本 Body。通过 TanStack Query mutation 调用 `/api/http/send`，展示响应状态、耗时、响应头和响应体；Base64 响应明确标记并允许复制。

## 收藏与本地状态

- 收藏以 slug 数组保存到 `localStorage`。
- 读取时过滤已不存在的 slug，并容忍损坏数据。
- 收藏变更立即更新首页和工具页。
- 不向后端发送收藏或主题信息。

## HTTP 代理接口

### 请求

`POST /api/http/send`

```json
{
  "url": "https://example.com/api",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"hello\":\"world\"}"
}
```

- `url` 必填。
- `method` 支持 GET、POST、PUT、PATCH、DELETE、HEAD、OPTIONS。
- `headers` 为可选字符串映射。
- `body` 为可选字符串。

### 成功响应

```json
{
  "status": 200,
  "headers": {
    "content-type": ["application/json"]
  },
  "body": "{\"ok\":true}",
  "bodyEncoding": "text",
  "durationMs": 124
}
```

无法安全解码为文本的响应体使用 Base64，并将 `bodyEncoding` 设为 `base64`。

### 错误响应

统一返回：

```json
{
  "code": "TARGET_BLOCKED",
  "message": "目标地址不允许访问"
}
```

错误类型至少包括输入无效、目标被拒绝、DNS 解析失败、上游超时、上游连接失败和响应体过大。生产响应不包含堆栈。

## HTTP 代理安全边界

- Spring Boot 仅绑定 `127.0.0.1`，默认端口为 `8080`。
- 仅允许 `http` 与 `https` URL。
- 拒绝包含用户信息、非法端口、畸形主机名或无法解析主机的 URL。
- 允许访问本机、常见局域网地址和公网目标。
- 拒绝链路本地元数据地址及常见云厂商元数据主机名，包括 AWS、GCP、Azure、阿里云和腾讯云的已知入口。
- 每次连接前检查解析得到的全部 IP；任何候选地址命中封禁范围即拒绝。
- 不自动信任重定向。每一跳都重新解析并执行相同校验，限制重定向次数，防止跳转绕过。
- 禁止调用方传递或覆盖 `Host`、`Content-Length`、`Connection`、`Transfer-Encoding`、`Upgrade`、`Proxy-Authorization` 等逐跳或敏感传输头。
- 默认总请求超时为 10 秒，默认响应体上限为 2 MiB；两者可通过 Spring 配置修改。
- 超出上限时立即终止读取并返回统一错误。
- 不记录请求或响应 Body，避免凭证和个人数据进入日志。

## 数据流

纯前端工具的数据只在组件与浏览器 API 之间流动。HTTP 工具将表单序列化后发送给本地后端；后端先校验 URL、协议、主机、DNS 结果和请求头，再向目标发起请求。重定向需要重新进入校验流程。后端限制读取量，将状态、响应头、编码后的 Body 和耗时返回前端。

## 测试与验收

前端使用 Vitest、Testing Library 和 jsdom：

- 测试各转换函数的正常输入、边界输入与错误输入。
- 测试注册表 slug 唯一、搜索匹配、分类派生和未知工具处理。
- 测试收藏的持久化、损坏数据恢复与界面同步。
- 测试 HTTP 表单提交、加载态以及各类中文错误展示。

后端使用 JUnit 5、MockMvc 和 MockWebServer：

- 测试方法、请求头和 Body 的正确转发。
- 测试文本与二进制响应。
- 测试超时、响应体大小限制和统一错误映射。
- 测试元数据主机/IP 拒绝、DNS 结果校验和重定向重新校验。
- 测试服务绑定地址和默认安全配置。

完成标准：

- `web` 测试通过且 Vite 生产构建成功。
- `server` 测试通过且 Maven 打包成功。
- 首页、所有工具页、主题、收藏和响应式布局通过浏览器视觉检查。
- README 能让具备 Java 21 与 Node.js 环境的开发者启动两个进程并使用 HTTP 工具。

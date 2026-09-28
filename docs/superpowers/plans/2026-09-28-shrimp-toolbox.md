# Shrimp 工具箱实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付一个中文本地开发者工具箱，包含统一工具注册与八个纯前端工具，以及受 SSRF 防护、超时和响应体上限约束的本机 HTTP 代理。

**Architecture:** `web` 是 React 19 单页应用，注册表驱动首页、搜索、分类与 TanStack Router 工具页，纯前端工具由独立领域函数提供能力，HTTP 工具通过 TanStack Query 调用 `server`。`server` 是仅绑定回环地址的 Spring Boot 3 应用，将 URL 安全策略、受限请求执行和 API 映射拆开测试。

**Tech Stack:** React 19、Vite、TypeScript、Tailwind CSS 4、shadcn/ui、TanStack Router、TanStack Query、Vitest、Testing Library、Spring Boot 3、Java 21、Maven、JUnit 5、MockMvc、MockWebServer。

**Spec:** `docs/superpowers/specs/2026-09-28-shrimp-toolbox-design.md`

## Global Constraints

- 项目目录固定为 `web/` 与 `server/`，界面文案使用中文。
- 前端使用 React 19、Vite、TypeScript、Tailwind CSS 4、shadcn/ui、TanStack Router 和 TanStack Query。
- Tailwind CSS 4 通过 CSS `@theme` 配置，不创建 `tailwind.config.js`。
- 服务端使用 Spring Boot 3、Java 21 和 Maven Wrapper，仅绑定 `127.0.0.1`。
- 工具详情路由为 `/tools/:slug`；收藏与主题只保存在浏览器本地。
- HTTP 代理只开放 `POST /api/http/send`，默认超时 10 秒、响应体上限 2 MiB。
- HTTP 代理允许公网、本机和局域网，但拒绝云元数据目标并逐跳复检重定向。
- 任何生产行为都先写失败测试、确认按预期失败，再写最小实现。

## File Map

- `web/src/tools/registry.ts`: 唯一工具元数据注册表。
- `web/src/tools/lib/*.ts`: 各工具无 UI 的可测试领域函数。
- `web/src/tools/components/*.tsx`: 各工具交互组件。
- `web/src/components/*`: shadcn/ui 基础组件与应用通用组件。
- `web/src/routes/*`: TanStack Router 页面。
- `web/src/features/favorites/*`: 收藏存储与 React 状态。
- `web/src/features/http/*`: HTTP 代理契约与请求客户端。
- `server/src/main/java/dev/shrimp/proxy/security/*`: URL、DNS、地址和请求头策略。
- `server/src/main/java/dev/shrimp/proxy/client/*`: 受限 HTTP 执行与响应编码。
- `server/src/main/java/dev/shrimp/proxy/api/*`: DTO、控制器和统一错误映射。

---

### Task 1: 前后端工程基线

**Files:**
- Create: `web/package.json`
- Create: `web/vite.config.ts`
- Create: `web/tsconfig.json`
- Create: `web/tsconfig.app.json`
- Create: `web/index.html`
- Create: `web/src/main.tsx`
- Create: `web/src/app.tsx`
- Create: `web/src/styles.css`
- Create: `web/src/test/setup.ts`
- Create: `web/src/smoke.test.tsx`
- Create: `web/components.json`
- Create: `server/pom.xml`
- Create: `server/mvnw`
- Create: `server/mvnw.cmd`
- Create: `server/.mvn/wrapper/maven-wrapper.properties`
- Create: `server/src/main/java/dev/shrimp/ShrimpServerApplication.java`
- Create: `server/src/main/resources/application.yml`
- Create: `server/src/test/java/dev/shrimp/ShrimpServerApplicationTest.java`
- Create: `.gitignore`

**Interfaces:**
- Produces: Vite test/build scripts, Spring application context, `server.address=127.0.0.1`, proxy configuration keys.

- [ ] **Step 1: 写前端冒烟失败测试**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './app'

describe('App', () => {
  it('显示中文产品名', () => {
    render(<App />)
    expect(screen.getByText('Shrimp 工具箱')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 安装前端依赖并验证测试因缺少 `App` 失败**

Run: `cd web && pnpm install && pnpm test --run src/smoke.test.tsx`

Expected: FAIL，错误指出无法解析 `./app`。

- [ ] **Step 3: 创建最小 Vite 应用与 Tailwind 4 CSS**

`package.json` 固定 scripts 为 `dev`、`build`、`test`、`typecheck`，依赖包含 React 19、`@vitejs/plugin-react`、`@tailwindcss/vite`、Vitest、jsdom 与 Testing Library。`src/app.tsx` 暂时返回 `<h1>Shrimp 工具箱</h1>`；`styles.css` 使用 `@import "tailwindcss"` 和 CSS 变量定义浅色/深色 token。

- [ ] **Step 4: 运行前端测试、类型检查和构建**

Run: `cd web && pnpm test --run && pnpm typecheck && pnpm build`

Expected: 全部成功且无 TypeScript 错误。

- [ ] **Step 5: 写 Spring 上下文与绑定地址测试**

```java
@SpringBootTest
class ShrimpServerApplicationTest {
  @Value("${server.address}") String address;

  @Test void bindsToLoopbackOnly() {
    assertThat(address).isEqualTo("127.0.0.1");
  }
}
```

- [ ] **Step 6: 验证 Maven 测试因工程缺失失败**

Run: `cd server && ./mvnw test`

Expected: FAIL，缺少 Maven 工程或应用类。

- [ ] **Step 7: 创建 Spring Boot 3 / Java 21 最小工程**

`application.yml` 设置 `server.address: 127.0.0.1`、`server.port: 8080`、`shrimp.proxy.timeout: 10s`、`shrimp.proxy.max-response-bytes: 2097152`、`shrimp.proxy.max-redirects: 5`。

- [ ] **Step 8: 运行服务端测试与打包**

Run: `cd server && ./mvnw test && ./mvnw package -DskipTests`

Expected: BUILD SUCCESS。

- [ ] **Step 9: 提交工程基线**

```bash
git add .gitignore web server
git commit -m "build: scaffold web and server applications"
```

### Task 2: 工具注册、搜索和路由外壳

**Files:**
- Create: `web/src/tools/types.ts`
- Create: `web/src/tools/registry.ts`
- Create: `web/src/tools/registry.test.ts`
- Create: `web/src/routes/routes.test.tsx`
- Create: `web/src/routes/__root.tsx`
- Create: `web/src/routes/index.tsx`
- Create: `web/src/routes/tools.$slug.tsx`
- Create: `web/src/router.tsx`
- Create: `web/src/components/app-shell.tsx`
- Create: `web/src/components/tool-card.tsx`
- Create: `web/src/components/tool-page.tsx`
- Create: `web/src/components/ui/button.tsx`
- Create: `web/src/components/ui/card.tsx`
- Create: `web/src/components/ui/input.tsx`
- Create: `web/src/lib/utils.ts`
- Modify: `web/src/app.tsx`
- Modify: `web/src/main.tsx`

**Interfaces:**
- Produces: `ToolDefinition`, `ToolCategory`, `tools`, `findTool(slug)`, `searchTools(query)`, `groupToolsByCategory(items)`.
- `ToolDefinition.component` is `ComponentType`; every `slug` maps to `/tools/${slug}`.

- [ ] **Step 1: 写注册表失败测试**

```ts
it('注册项 slug 和路径唯一且路径匹配 slug', () => {
  expect(new Set(tools.map((tool) => tool.slug)).size).toBe(tools.length)
  expect(new Set(tools.map((tool) => tool.path)).size).toBe(tools.length)
  expect(tools.every((tool) => tool.path === `/tools/${tool.slug}`)).toBe(true)
})

it('搜索同时匹配名称、关键词、分类和简介', () => {
  expect(searchTools('令牌').map((tool) => tool.slug)).toContain('jwt')
  expect(searchTools('编码转换').map((tool) => tool.slug)).toEqual(expect.arrayContaining(['base64', 'jwt']))
})
```

- [ ] **Step 2: 运行测试并确认缺少注册表而失败**

Run: `cd web && pnpm test --run src/tools/registry.test.ts`

Expected: FAIL，无法解析 `registry`。

- [ ] **Step 3: 实现类型、九条注册项与纯函数检索**

注册 `json`、`base64`、`jwt`、`hash`、`timestamp`、`uuid`、`cron`、`regex`、`http`；尚未实现的工具统一渲染 `ToolUnavailable`，文案为“该工具正在本次构建中”，后续任务逐一替换。

- [ ] **Step 4: 验证注册表测试通过**

Run: `cd web && pnpm test --run src/tools/registry.test.ts`

Expected: PASS。

- [ ] **Step 5: 写首页搜索和未知 slug 的路由测试**

使用内存 history 创建 router，断言首页输入“JWT”后仅展示 JWT 卡片，并断言 `/tools/not-found` 显示“未找到这个工具”。

- [ ] **Step 6: 运行路由测试并确认失败**

Run: `cd web && pnpm test --run src/routes`

Expected: FAIL，路由组件尚未实现。

- [ ] **Step 7: 实现 TanStack Router、QueryClient 与应用外壳**

根路由渲染 `AppShell` 与 `<Outlet />`；首页渲染搜索框和分类卡片；工具路由通过 `findTool` 渲染 `ToolPage`，未知 slug 显示中文未找到状态。

- [ ] **Step 8: 运行前端测试和构建**

Run: `cd web && pnpm test --run && pnpm typecheck && pnpm build`

Expected: 全部通过。

- [ ] **Step 9: 提交注册与路由**

```bash
git add web
git commit -m "feat(web): add registry-driven toolbox routes"
```

### Task 3: 主题与收藏

**Files:**
- Create: `web/src/features/favorites/storage.ts`
- Create: `web/src/features/favorites/storage.test.ts`
- Create: `web/src/features/favorites/favorites-provider.tsx`
- Create: `web/src/features/favorites/favorites-provider.test.tsx`
- Create: `web/src/features/theme/theme-provider.tsx`
- Create: `web/src/features/theme/theme-provider.test.tsx`
- Create: `web/src/components/favorite-button.tsx`
- Create: `web/src/components/theme-toggle.tsx`
- Modify: `web/src/components/app-shell.tsx`
- Modify: `web/src/components/tool-card.tsx`
- Modify: `web/src/components/tool-page.tsx`
- Modify: `web/src/routes/index.tsx`

**Interfaces:**
- Produces: `readFavorites(validSlugs): string[]`, `writeFavorites(slugs): void`, `useFavorites(): { favorites: Set<string>; toggle(slug): void }`.

- [ ] **Step 1: 写损坏收藏数据与未知 slug 过滤测试**

```ts
it('损坏数据返回空数组', () => {
  localStorage.setItem('shrimp:favorites', '{bad')
  expect(readFavorites(new Set(['json']))).toEqual([])
})

it('过滤已经不存在的工具', () => {
  localStorage.setItem('shrimp:favorites', JSON.stringify(['json', 'removed']))
  expect(readFavorites(new Set(['json']))).toEqual(['json'])
})
```

- [ ] **Step 2: 运行测试并确认缺少存储模块而失败**

Run: `cd web && pnpm test --run src/features/favorites/storage.test.ts`

Expected: FAIL。

- [ ] **Step 3: 实现收藏存储与 Provider**

使用 key `shrimp:favorites`，Provider 初始化时传入注册表有效 slug；toggle 使用函数式状态更新并同步 `localStorage`。

- [ ] **Step 4: 写并运行收藏交互测试**

断言点击“收藏 JSON”后按钮变为“取消收藏 JSON”，首页“我的收藏”出现 JSON 卡片，重新挂载后仍保留。

- [ ] **Step 5: 实现主题 Provider 和切换按钮**

使用 key `shrimp:theme`，值为 `light | dark | system`；将解析后的主题应用到 `document.documentElement.classList`，按钮提供中文无障碍名称。

- [ ] **Step 6: 运行收藏、路由和全量前端测试**

Run: `cd web && pnpm test --run && pnpm typecheck`

Expected: PASS。

- [ ] **Step 7: 提交本地偏好**

```bash
git add web/src
git commit -m "feat(web): persist theme and tool favorites"
```

### Task 4: JSON、Base64 与 JWT 工具

**Files:**
- Create: `web/src/tools/lib/json.ts`
- Create: `web/src/tools/lib/json.test.ts`
- Create: `web/src/tools/lib/base64.ts`
- Create: `web/src/tools/lib/base64.test.ts`
- Create: `web/src/tools/lib/jwt.ts`
- Create: `web/src/tools/lib/jwt.test.ts`
- Create: `web/src/tools/components/json-tool.tsx`
- Create: `web/src/tools/components/base64-tool.tsx`
- Create: `web/src/tools/components/jwt-tool.tsx`
- Create: `web/src/components/ui/textarea.tsx`
- Create: `web/src/components/ui/tabs.tsx`
- Modify: `web/src/tools/registry.ts`

**Interfaces:**
- Produces: `formatJson(input, indent): Result<string>`, `minifyJson(input): Result<string>`, `encodeBase64Utf8(input): string`, `decodeBase64Utf8(input): Result<string>`, `decodeJwt(input): Result<{ header: unknown; payload: unknown }>`.
- `Result<T>` is `{ ok: true; value: T } | { ok: false; error: string }` in `web/src/tools/lib/result.ts`.

- [ ] **Step 1: 写领域函数失败测试**

覆盖 JSON 格式化/压缩/非法输入、Base64 中文往返/非法输入、Base64URL JWT Header 和 Payload 解码、少于三段的 JWT 拒绝。

```ts
expect(encodeBase64Utf8('虾米')).toBe('6Jm+57Gz')
expect(decodeJwt('eyJhbGciOiJub25lIn0.eyJzdWIiOiLmtYvor5UifQ.').ok).toBe(true)
```

- [ ] **Step 2: 运行测试并确认函数缺失导致失败**

Run: `cd web && pnpm test --run src/tools/lib/json.test.ts src/tools/lib/base64.test.ts src/tools/lib/jwt.test.ts`

Expected: FAIL。

- [ ] **Step 3: 实现最小领域函数**

JSON 使用 `JSON.parse/stringify` 并把 SyntaxError 映射为中文；Base64 使用 `TextEncoder/TextDecoder` 与严格字符/填充校验；JWT 将 Base64URL 转换为标准 Base64 后按 UTF-8 解码并解析 JSON。

- [ ] **Step 4: 运行领域测试并确认通过**

Run: `cd web && pnpm test --run src/tools/lib/json.test.ts src/tools/lib/base64.test.ts src/tools/lib/jwt.test.ts`

Expected: PASS。

- [ ] **Step 5: 写三个工具组件的关键交互测试**

断言 JSON 点击格式化后输出缩进文本；Base64 编码中文；JWT 页面始终出现“不验证签名”提示且展示 Header/Payload。

- [ ] **Step 6: 实现组件并将对应注册项从 `ToolUnavailable` 切换为实际组件**

组件使用统一卡片、标签、textarea、操作按钮、复制反馈和 `role=alert` 中文错误。

- [ ] **Step 7: 运行全量前端验证**

Run: `cd web && pnpm test --run && pnpm typecheck && pnpm build`

Expected: PASS。

- [ ] **Step 8: 提交编码工具**

```bash
git add web/src
git commit -m "feat(web): add JSON Base64 and JWT tools"
```

### Task 5: 哈希、时间戳与 UUID 工具

**Files:**
- Create: `web/src/tools/lib/hash.ts`
- Create: `web/src/tools/lib/hash.test.ts`
- Create: `web/src/tools/lib/timestamp.ts`
- Create: `web/src/tools/lib/timestamp.test.ts`
- Create: `web/src/tools/lib/uuid.ts`
- Create: `web/src/tools/lib/uuid.test.ts`
- Create: `web/src/tools/components/hash-tool.tsx`
- Create: `web/src/tools/components/timestamp-tool.tsx`
- Create: `web/src/tools/components/uuid-tool.tsx`
- Create: `web/src/components/ui/select.tsx`
- Modify: `web/src/tools/registry.ts`

**Interfaces:**
- Produces: `hashText(text, algorithm): Promise<string>`, `parseTimestamp(input, unit): Result<TimeResult>`, `fromIso(input): Result<TimeResult>`, `generateUuidBatch(count): Result<string[]>`.

- [ ] **Step 1: 写已知摘要、时间单位和 UUID 失败测试**

```ts
expect(await hashText('abc', 'SHA-256')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
expect(parseTimestamp('0', 'seconds')).toMatchObject({ ok: true, value: { iso: '1970-01-01T00:00:00.000Z' } })
expect(generateUuidBatch(0)).toEqual({ ok: false, error: '生成数量必须在 1 到 100 之间' })
```

- [ ] **Step 2: 运行测试并确认缺少实现而失败**

Run: `cd web && pnpm test --run src/tools/lib/hash.test.ts src/tools/lib/timestamp.test.ts src/tools/lib/uuid.test.ts`

Expected: FAIL。

- [ ] **Step 3: 实现领域函数并通过测试**

哈希使用 `crypto.subtle.digest`；时间结果包含 `iso`、`local`、`seconds`、`milliseconds`；UUID 使用 `crypto.randomUUID()`，数量限制 1–100。

- [ ] **Step 4: 写组件交互测试并确认失败**

覆盖选择 SHA-512、秒/毫秒切换、非法日期错误、批量 UUID 数量和复制。

- [ ] **Step 5: 实现三个组件并注册**

时间戳页面提供当前时间快捷按钮；UUID 默认生成 5 个；异步哈希显示计算中状态。

- [ ] **Step 6: 运行全量前端验证**

Run: `cd web && pnpm test --run && pnpm typecheck && pnpm build`

Expected: PASS。

- [ ] **Step 7: 提交生成与时间工具**

```bash
git add web/src
git commit -m "feat(web): add hash timestamp and UUID tools"
```

### Task 6: Cron 与正则工具

**Files:**
- Create: `web/src/tools/lib/cron.ts`
- Create: `web/src/tools/lib/cron.test.ts`
- Create: `web/src/tools/lib/regex.ts`
- Create: `web/src/tools/lib/regex.test.ts`
- Create: `web/src/tools/components/cron-tool.tsx`
- Create: `web/src/tools/components/regex-tool.tsx`
- Modify: `web/src/tools/registry.ts`
- Modify: `web/package.json`

**Interfaces:**
- Produces: `analyzeCron(expression, from, count): Result<{ description: string; nextRuns: string[] }>`, `runRegex(pattern, flags, text): Result<RegexMatch[]>`.
- `RegexMatch` includes `match`, `index`, and `groups: string[]`.

- [ ] **Step 1: 写 Cron 五段约束和正则匹配失败测试**

```ts
expect(analyzeCron('*/15 * * * *', new Date('2026-01-01T00:00:00Z'), 2)).toMatchObject({
  ok: true,
  value: { nextRuns: ['2026-01-01T00:15:00.000Z', '2026-01-01T00:30:00.000Z'] },
})
expect(analyzeCron('0 0 0 * * *', new Date(), 5)).toEqual(expect.objectContaining({ ok: false }))
expect(runRegex('(虾)(米)', 'g', '虾米虾米')).toMatchObject({ ok: true, value: [{ index: 0, groups: ['虾', '米'] }, { index: 2 }] })
```

- [ ] **Step 2: 安装固定版本 Cron 解析依赖并确认测试失败**

使用支持标准五段表达式和后续日期枚举的轻量库；将依赖版本锁定在 `pnpm-lock.yaml`。运行测试应因领域模块缺失失败。

- [ ] **Step 3: 实现 Cron 包装器与中文描述**

包装器先验证恰好五段，再调用库解析；中文描述至少覆盖通配符、固定值、列表、范围与步长；后续时间统一输出 ISO。

- [ ] **Step 4: 实现正则函数并防止空匹配死循环**

校验 flags 只包含 `d g i m s u v y` 且不重复；无 `g` 时返回首个匹配，有 `g` 时枚举全部匹配并保留捕获组。

- [ ] **Step 5: 运行领域测试并确认通过**

Run: `cd web && pnpm test --run src/tools/lib/cron.test.ts src/tools/lib/regex.test.ts`

Expected: PASS。

- [ ] **Step 6: 写组件测试、实现组件并替换注册表项**

Cron 展示中文含义和未来五次时间；正则高亮匹配摘要并列表展示索引、完整匹配与捕获组。

- [ ] **Step 7: 运行全量前端验证并提交**

Run: `cd web && pnpm test --run && pnpm typecheck && pnpm build`

```bash
git add web
git commit -m "feat(web): add cron and regular expression tools"
```

### Task 7: HTTP 代理安全策略

**Files:**
- Create: `server/src/main/java/dev/shrimp/proxy/config/ProxyProperties.java`
- Create: `server/src/main/java/dev/shrimp/proxy/security/BlockedTargetException.java`
- Create: `server/src/main/java/dev/shrimp/proxy/security/TargetValidator.java`
- Create: `server/src/main/java/dev/shrimp/proxy/security/HeaderSanitizer.java`
- Create: `server/src/test/java/dev/shrimp/proxy/security/TargetValidatorTest.java`
- Create: `server/src/test/java/dev/shrimp/proxy/security/HeaderSanitizerTest.java`

**Interfaces:**
- Produces: `ValidatedTarget validate(URI uri)`, where target includes normalized URI and resolved addresses.
- Produces: `HttpHeaders sanitize(Map<String,String> input)`.
- `TargetValidator` consumes an injected `DnsResolver` so tests never depend on public DNS.

- [ ] **Step 1: 写协议、元数据主机、IP 和 DNS 结果失败测试**

覆盖 `file:`、URL 用户信息、`169.254.169.254`、IPv6 链路本地、`metadata.google.internal`、阿里云与腾讯云元数据入口；断言 `localhost`、`127.0.0.1`、`192.168.1.10` 和普通公网地址允许。

- [ ] **Step 2: 运行安全策略测试并确认缺少类而失败**

Run: `cd server && ./mvnw -Dtest=TargetValidatorTest,HeaderSanitizerTest test`

Expected: FAIL，目标类不存在。

- [ ] **Step 3: 实现 URL 与地址策略**

仅允许 HTTP/HTTPS；主机名转为小写并移除末尾点；阻止精确元数据主机及其子域；解析所有候选 IP，拒绝 `169.254.0.0/16`、`fe80::/10` 和已知元数据特殊地址，但不拒绝 loopback、RFC1918 与普通公网。

- [ ] **Step 4: 实现请求头清理**

大小写不敏感地拒绝 `host`、`content-length`、`connection`、`transfer-encoding`、`upgrade`、`proxy-authorization`、`proxy-authenticate`、`te`、`trailer` 和 `keep-alive`，允许 `authorization` 与内容类型。

- [ ] **Step 5: 运行安全策略测试并确认通过**

Run: `cd server && ./mvnw -Dtest=TargetValidatorTest,HeaderSanitizerTest test`

Expected: PASS。

- [ ] **Step 6: 提交安全策略**

```bash
git add server
git commit -m "feat(server): validate proxy targets and headers"
```

### Task 8: 受限 HTTP 客户端与代理 API

**Files:**
- Create: `server/src/main/java/dev/shrimp/proxy/api/HttpSendRequest.java`
- Create: `server/src/main/java/dev/shrimp/proxy/api/HttpSendResponse.java`
- Create: `server/src/main/java/dev/shrimp/proxy/api/ApiError.java`
- Create: `server/src/main/java/dev/shrimp/proxy/api/HttpProxyController.java`
- Create: `server/src/main/java/dev/shrimp/proxy/api/ProxyExceptionHandler.java`
- Create: `server/src/main/java/dev/shrimp/proxy/client/LimitedHttpClient.java`
- Create: `server/src/main/java/dev/shrimp/proxy/client/ResponseBodyReader.java`
- Create: `server/src/test/java/dev/shrimp/proxy/client/LimitedHttpClientTest.java`
- Create: `server/src/test/java/dev/shrimp/proxy/api/HttpProxyControllerTest.java`
- Modify: `server/pom.xml`

**Interfaces:**
- `POST /api/http/send` consumes `HttpSendRequest(url, method, headers, body)`.
- Returns `HttpSendResponse(status, headers, body, bodyEncoding, durationMs)`.
- Error JSON is `ApiError(code, message)`.

- [ ] **Step 1: 写 MockWebServer 转发与编码失败测试**

覆盖 GET、POST Body、自定义 Header、文本响应、无效 UTF-8 二进制响应、响应体超过 2 MiB、10 秒总超时和重定向逐跳调用 validator。

- [ ] **Step 2: 运行客户端测试并确认缺少实现而失败**

Run: `cd server && ./mvnw -Dtest=LimitedHttpClientTest test`

Expected: FAIL。

- [ ] **Step 3: 实现受限 HTTP 客户端**

使用 Java `HttpClient` 并关闭自动重定向；每一跳调用 `TargetValidator`；最多五跳；流式读取时在 `maxResponseBytes + 1` 处终止；依据 Content-Type charset 且严格解码，解码失败则 Base64；记录单调时钟耗时，不记录 Body。

- [ ] **Step 4: 运行客户端测试并确认通过**

Run: `cd server && ./mvnw -Dtest=LimitedHttpClientTest test`

Expected: PASS。

- [ ] **Step 5: 写 MockMvc API 失败测试**

断言有效请求返回契约字段；非法方法返回 `INVALID_REQUEST`；元数据目标返回 `TARGET_BLOCKED`；超时、连接失败和响应过大分别映射 `UPSTREAM_TIMEOUT`、`UPSTREAM_CONNECTION_FAILED`、`RESPONSE_TOO_LARGE`，且无堆栈字段。

- [ ] **Step 6: 实现 DTO、Controller 与异常映射**

使用 Bean Validation 校验 URL、method 和 headers；Controller 只负责边界转换；异常处理器返回稳定中文消息。

- [ ] **Step 7: 运行服务端全量测试与打包**

Run: `cd server && ./mvnw test && ./mvnw package -DskipTests`

Expected: BUILD SUCCESS。

- [ ] **Step 8: 提交 HTTP 代理**

```bash
git add server
git commit -m "feat(server): add guarded HTTP proxy endpoint"
```

### Task 9: HTTP 前端工具

**Files:**
- Create: `web/src/features/http/types.ts`
- Create: `web/src/features/http/client.ts`
- Create: `web/src/features/http/client.test.ts`
- Create: `web/src/tools/components/http-tool.tsx`
- Create: `web/src/tools/components/http-tool.test.tsx`
- Create: `web/src/components/ui/badge.tsx`
- Modify: `web/src/tools/registry.ts`
- Modify: `web/vite.config.ts`

**Interfaces:**
- Produces: `sendHttpRequest(request, signal): Promise<HttpSendResponse>`.
- Dev server proxies `/api` to `http://127.0.0.1:8080`.

- [ ] **Step 1: 写客户端错误映射失败测试**

模拟 403 `{ code: 'TARGET_BLOCKED', message: '目标地址不允许访问' }`，断言 reject 的 `ProxyApiError` 保留 code/message；成功时解析 status、headers、body、bodyEncoding 和 durationMs。

- [ ] **Step 2: 运行客户端测试并确认失败**

Run: `cd web && pnpm test --run src/features/http/client.test.ts`

Expected: FAIL。

- [ ] **Step 3: 实现类型与 fetch 客户端**

发送 JSON 到 `/api/http/send`，传递 AbortSignal；非 2xx 优先解析统一错误，否则使用通用中文网络错误。

- [ ] **Step 4: 写 HTTP 工具组件失败测试**

输入 URL、选择 POST、添加 `Content-Type` 头与 JSON Body，点击发送后断言 mutation 收到正确 DTO；测试加载态禁用按钮；分别断言目标拒绝、超时与过大响应的中文提示。

- [ ] **Step 5: 运行组件测试并确认失败**

Run: `cd web && pnpm test --run src/tools/components/http-tool.test.tsx`

Expected: FAIL。

- [ ] **Step 6: 实现 HTTP 工具和动态请求头编辑器**

使用 `useMutation`；展示响应状态 badge、耗时、可折叠响应头与 body；Base64 内容显示明确标记；提供复制按钮，不在浏览器端直接请求用户 URL。

- [ ] **Step 7: 运行前端全量验证并提交**

Run: `cd web && pnpm test --run && pnpm typecheck && pnpm build`

```bash
git add web
git commit -m "feat(web): add HTTP request tool"
```

### Task 10: 文档、端到端验收与视觉 QA

**Files:**
- Create: `README.md`
- Create: `web/.env.example`
- Modify: `web/src/styles.css`
- Modify: relevant component files discovered by visual QA

**Interfaces:**
- Produces: Java 21 + pnpm 本地启动说明、代理安全边界说明、完整验证记录。

- [ ] **Step 1: 写 README 验收检查**

创建一个文档测试或 shell 检查，断言 README 包含 Java 21、pnpm、`./mvnw spring-boot:run`、`pnpm dev`、`127.0.0.1`、2 MiB、10 秒与元数据地址限制。

- [ ] **Step 2: 运行检查并确认 README 缺失导致失败**

Run: `test -f README.md && rg -q 'Java 21' README.md`

Expected: FAIL。

- [ ] **Step 3: 编写 README**

包含环境要求、安装、前后端启动、测试、构建、工具清单、HTTP 请求示例、安全限制和配置键；说明该代理只能作为本地开发工具，不应监听公网。

- [ ] **Step 4: 启动后端和前端开发服务器**

Run in terminal 1: `cd server && ./mvnw spring-boot:run`

Run in terminal 2: `cd web && pnpm dev --host 127.0.0.1`

Expected: 后端监听 `127.0.0.1:8080`，前端打印本机预览 URL。

- [ ] **Step 5: 浏览器视觉检查**

检查浅色/深色首页、搜索结果、收藏区、九个工具页、未知 slug、375px 手机宽度与 1440px 桌面宽度。验证文字无截断、键盘焦点可见、表单标签完整、错误不会引起布局溢出。

- [ ] **Step 6: 浏览器功能冒烟**

手动完成 JSON 格式化、中文 Base64 往返、JWT 解码、SHA-256、时间戳 0、批量 UUID、`*/15 * * * *`、正则捕获组，以及通过本地代理请求 MockWebServer 或可控本机端点。

- [ ] **Step 7: 运行最终验证**

Run: `cd web && pnpm test --run && pnpm typecheck && pnpm build`

Run: `cd server && ./mvnw test && ./mvnw package -DskipTests`

Run: `git diff --check && git status --short`

Expected: 所有测试和构建成功；无空白错误；仅存在预期修改。

- [ ] **Step 8: 提交文档和 QA 修正**

```bash
git add README.md web server
git commit -m "docs: add setup guide and finish visual QA"
```

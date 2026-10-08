# Shrimp Server

Shrimp 工具箱的本机 HTTP 代理。前端的 HTTP 请求工具把请求发到这里，服务校验目标后再转发。它只给本机用，不保存业务数据，也不记录请求或响应 Body。

技术栈：Spring Boot 3.5、Java 21。入口类是 `shrimp.ShrimpApplication`。构建使用本目录的 Gradle Wrapper（8.14.3）。

## 环境要求

- Java 21。`build.gradle.kts` 用 toolchain 固定语言版本。

## 本地启动

```bash
./gradlew bootRun
```

`src/main/resources/application.yml` 把服务绑在 `127.0.0.1:8080`。保持回环地址，不要把该进程暴露到局域网或公网。

测试：

```bash
./gradlew test
```

## 接口

`GET /api/http/status` 返回本地代理的可用状态和当前生效的限制，不会请求上游服务。例如默认配置：

```json
{
  "available": true,
  "allowedMethods": ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
  "timeoutMs": 10000,
  "maxRequestBytes": 1048576,
  "maxRequestEnvelopeBytes": 2097152,
  "maxRequestHeaders": 64,
  "maxRequestHeaderBytes": 16384,
  "maxResponseBytes": 2097152,
  "maxResponseHeaders": 100,
  "maxResponseHeaderLineLength": 8192,
  "maxRedirects": 5
}
```

`available` 表示本机代理接口正在响应请求，不保证目标网站可达。限制值从当前 `shrimp.proxy` 配置读取；`allowedMethods` 与发送接口的校验共用同一列表。

`POST /api/http/send`

```json
{
  "url": "https://example.com",
  "method": "GET",
  "headers": {},
  "body": null,
  "bodyEncoding": "text"
}
```

`method` 支持 `GET`、`POST`、`PUT`、`PATCH`、`DELETE`、`HEAD`、`OPTIONS`。`headers` 和 `body` 可选。`bodyEncoding` 可选值为 `text`（默认，按 UTF-8 编码）或 `base64`（严格 Base64 解码后按原始字节发送）；无效 Base64 返回 `INVALID_REQUEST`，不会连接上游。上游请求的 `Content-Length` 和 `max-request-bytes` 检查均以解码后的实际字节为准。

成功时返回状态码、响应头、Body、`bodyEncoding`（`text` 或 `base64`）和 `durationMs`。上游的 HTTP 状态码（包括 `4xx`/`5xx`）放在 JSON 的 `status` 字段中，本地接口仍返回 200；HEAD、204、304 没有响应体时 `body` 为空字符串。无法按文本安全解码的 Body 使用 Base64；代理不会根据 `Content-Encoding` 自动解压，压缩的二进制内容也会按 Base64 返回，原始 `Content-Encoding` 保留在响应头中。重复响应头按小写名称聚合为数组。

失败时返回统一错误，不含堆栈：

```json
{
  "code": "TARGET_BLOCKED",
  "message": "目标地址不允许访问"
}
```

错误码包括 `INVALID_REQUEST`、`TARGET_BLOCKED`、`DNS_RESOLUTION_FAILED`、`UPSTREAM_TIMEOUT`、`UPSTREAM_CONNECTION_FAILED`、`RESPONSE_TOO_LARGE`、`UPSTREAM_RESPONSE_HEADERS_TOO_LARGE`、`TOO_MANY_REDIRECTS`。
发送接口的 JSON 外层超过 `max-request-envelope-bytes` 时返回 HTTP 413，错误码为 `REQUEST_TOO_LARGE`，消息为“请求体超过大小限制”。该读取保护也适用于没有 `Content-Length` 的分块请求；请求不会进入 JSON 解析或上游转发。JSON 解析还限制嵌套深度 100、字符串长度 1048576、数字长度 1000、字段名长度 1024；触发解析约束时返回 HTTP 400 `INVALID_REQUEST`，不会调用上游。普通响应序列化不受这些读取约束影响。

`headers` 最多包含 64 个自定义条目，所有名称与值的 UTF-8 字节数相加最多 16384 字节；JSON 语法字符与 HTTP 传输开销不计入。空字符串值允许，名称仍计入字节数。名称按大小写不敏感比较，重复名称会返回 HTTP 400 `INVALID_REQUEST`；JSON 中完全重复的字段名也会拒绝。数量或字节数超限返回 HTTP 431 `REQUEST_HEADERS_TOO_LARGE`，不会向上游发请求。

## 配置

`application.yml` 中的 `shrimp.proxy`：

- `timeout`：整次请求超时，默认 `10s`。预算覆盖每一跳的 DNS 校验、连接、TLS、读取和重定向；DNS 校验使用固定 16 个并发槽位，超时返回 `UPSTREAM_TIMEOUT`。底层解析若忽略中断，已提交的任务会继续占用槽位直到解析结束，但不会无限创建任务。
- `max-request-bytes`：发送接口解码后请求体上限，默认 `1048576`（1 MiB）；必须大于 0 且小于 2 GiB。入站 JSON 外层仍有读取保护，Base64 字符串长度不作为上游请求体长度发送。
- `max-request-envelope-bytes`：入站 `/api/http/send` JSON 外层的读取上限，默认 `2097152`（2 MiB），必须大于 0 且小于 2 GiB。该上限覆盖 Base64 膨胀和 JSON 开销；解码后的实际请求体仍严格受 `max-request-bytes` 限制。
- `max-request-headers`：自定义请求头条目数上限，默认 `64`，必须大于 0。
- `max-request-header-bytes`：自定义请求头名称与值的 UTF-8 字节数之和上限，默认 `16384`（16 KiB），必须大于 0。
- `max-response-bytes`：响应体上限，默认 `2097152`（2 MiB）。超出后停止读取。
- `max-response-headers`：每一跳上游响应头数量上限，默认 `100`，必须大于 0。
- `max-response-header-line-length`：每一跳上游响应头单行长度上限，默认 `8192`，必须大于 0；HTTP/1 解析器也用它限制响应状态行。超过任一响应头限制时返回 HTTP 502 `UPSTREAM_RESPONSE_HEADERS_TOO_LARGE`，不返回部分上游响应。
- `max-redirects`：重定向上限，默认 `5`。每一跳都会重新解析并校验。
- 上游并发：代理固定最多同时执行 `128` 个上游请求；达到上限时请求会在自身 `timeout` 预算内等待，无法取得槽位则返回 `UPSTREAM_TIMEOUT`。该限制用于防止高并发请求同时创建连接、响应读取和临时传输资源。

## 安全边界

- 只接受 `http` 与 `https`。拒绝带用户信息或片段的 URL、非法端口、无法解析的主机。
- 允许本机、常见局域网和公网目标。拒绝链路本地地址，以及常见云厂商元数据主机名（AWS、GCP、Azure、阿里云、腾讯云）。解析到的任一地址命中即拒绝；IPv4-mapped IPv6 地址也按其内嵌 IPv4 地址校验。
- 调用方不能覆盖 `Host`、`Content-Length` 等逐跳或敏感传输头。
- `/api/http/send` 只接受无 `Origin` 的 CLI 调用、明确的本机来源（`localhost`、`127.0.0.1`、`::1`，任意开发端口）或非跨站的浏览器请求；Origin 必须是单个、无 userinfo/路径/查询的标准 HTTP(S) origin。重复 Origin、逗号拼接值、非本机 Origin、`Origin: null`、无效 Origin，或 `Sec-Fetch-Site: cross-site` 的 POST/OPTIONS 会返回 403 `CROSS_SITE_REQUEST_BLOCKED`。这会阻断 JSON、简单表单和预检触达代理，保留本机 Vite 开发代理与 curl/CLI 使用；不改变代理访问 localhost/私网目标的能力。
- 跨站过滤会按 Spring MVC 的路径参数规范化识别 `/api/http/send`，包括矩阵参数变体；其他未映射路径仍由 MVC 正常处理。
- 每一跳先校验 DNS 解析出的全部地址，再把该跳连接限定到已校验的地址；连接阶段不会对原主机名再次做系统 DNS 查询。重定向到新主机时重复此流程，防止解析结果在校验与连接之间变化。
- 自动跟随重定向时，按协议、主机名和有效端口比较每一跳的 origin（默认 HTTP 80、HTTPS 443）。跨 origin 后移除 `Authorization`、`Cookie`、`Cookie2`、`X-Api-Key`、`X-Auth-Token`、`X-Access-Token`、`X-Authorization`，后续即使跳回原 origin 也不恢复；同 origin 保留这些头。HTTPS→HTTP 降级也属于跨 origin，但重定向本身仍允许。其他自定义头及按现有重定向语义保留的请求体可能包含敏感数据，调用方不应把机密放入不受保护的字段。
- HTTPS 仍使用 URL 的原主机名发送 SNI、设置 `Host` 并验证服务器证书，不用固定的 IP 地址代替主机名做证书校验。传输层使用 Apache HttpClient 5 的自定义 DNS 解析器；目前按 HTTP/1.1、每跳独立连接处理，以换取明确的地址绑定和隔离，连接复用效率可能低于共享客户端。

## 目录结构

一次请求从 `api` 进来，先经过 `security` 校验目标和请求头，再由 `client` 转发并限制超时、重定向和响应体大小。失败都回到 `ProxyExceptionHandler`，变成统一的 `code` 与中文 `message`。

```text
server/
  settings.gradle.kts                         工程名 shrimp-server
  build.gradle.kts                            Spring Boot 插件、Java 21、依赖
  gradlew
  gradlew.bat                                 Gradle Wrapper 启动脚本
  gradle/wrapper/                             Wrapper 版本与发行包
  src/main/
    resources/
      application.yml                         监听地址、端口和 shrimp.proxy 默认值
    java/shrimp/
      ShrimpApplication.java                  启动类，启用代理配置
      proxy/
        api/                                  HTTP 入口
          HttpProxyController.java            GET /api/http/status、POST /api/http/send
          HttpProxyStatus.java                代理可用状态与当前限制
          ProxyJsonConfiguration.java          拒绝 JSON 重复字段名
          RequestBodyLimitFilter.java          转发前限制入站请求体实际读取字节数
          HttpSendRequest.java                url、method、headers、body
          HttpSendResponse.java               状态码、响应头、Body、编码、耗时
          ApiError.java                       失败时的 code 与 message
          ProxyExceptionHandler.java          把校验和上游异常映射成 HTTP 错误
        client/                               向外发出的请求
          LimitedHttpClient.java              手动跟随重定向，每跳重新校验
          PinnedHttpTransport.java            每跳连接到已校验 IP，保留原主机名与 TLS 校验
          ResponseBodyReader.java             按大小上限读取，文本或 Base64
          UpstreamTimeoutException.java
          UpstreamConnectionException.java
          ResponseTooLargeException.java
          TooManyRedirectsException.java
        security/                             发出去之前的检查
          TargetValidator.java                协议、主机、端口、DNS 和元数据地址
          HeaderSanitizer.java                去掉 Host、Content-Length 等敏感头
          DnsResolver.java                    主机名解析
          ValidatedTarget.java                校验通过后的 URI 和地址
          BlockedTargetException.java
          DnsResolutionException.java
          InvalidTargetException.java
          InvalidHeaderException.java
          RequestHeadersTooLargeException.java
        config/
          ProxyProperties.java                读取 shrimp.proxy
  src/test/java/shrimp/                       与 main 相同的包结构
    ShrimpApplicationTest.java                绑定地址和默认安全配置
    proxy/api/HttpProxyControllerTest.java    接口契约与错误映射
    proxy/client/LimitedHttpClientTest.java   转发、超时和响应体限制
    proxy/security/                           目标地址和请求头策略
```

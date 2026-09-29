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

`POST /api/http/send`

```json
{
  "url": "https://example.com",
  "method": "GET",
  "headers": {},
  "body": null
}
```

`method` 支持 `GET`、`POST`、`PUT`、`PATCH`、`DELETE`、`HEAD`、`OPTIONS`。`headers` 和 `body` 可选。

成功时返回状态码、响应头、Body、`bodyEncoding`（`text` 或 `base64`）和 `durationMs`。无法按文本安全解码的 Body 使用 Base64。

失败时返回统一错误，不含堆栈：

```json
{
  "code": "TARGET_BLOCKED",
  "message": "目标地址不允许访问"
}
```

错误码包括 `INVALID_REQUEST`、`TARGET_BLOCKED`、`DNS_RESOLUTION_FAILED`、`UPSTREAM_TIMEOUT`、`UPSTREAM_CONNECTION_FAILED`、`RESPONSE_TOO_LARGE`、`TOO_MANY_REDIRECTS`。

## 配置

`application.yml` 中的 `shrimp.proxy`：

- `timeout`：整次请求超时，默认 `10s`。
- `max-response-bytes`：响应体上限，默认 `2097152`（2 MiB）。超出后停止读取。
- `max-redirects`：重定向上限，默认 `5`。每一跳都会重新解析并校验。

## 安全边界

- 只接受 `http` 与 `https`。拒绝带用户信息或片段的 URL、非法端口、无法解析的主机。
- 允许本机、常见局域网和公网目标。拒绝链路本地地址，以及常见云厂商元数据主机名（AWS、GCP、Azure、阿里云、腾讯云）。解析到的任一地址命中即拒绝。
- 调用方不能覆盖 `Host`、`Content-Length` 等逐跳或敏感传输头。

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
          HttpProxyController.java            POST /api/http/send
          HttpSendRequest.java                url、method、headers、body
          HttpSendResponse.java               状态码、响应头、Body、编码、耗时
          ApiError.java                       失败时的 code 与 message
          ProxyExceptionHandler.java          把校验和上游异常映射成 HTTP 错误
        client/                               向外发出的请求
          LimitedHttpClient.java              手动跟随重定向，每跳重新校验
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
        config/
          ProxyProperties.java                读取 shrimp.proxy
  src/test/java/shrimp/                       与 main 相同的包结构
    ShrimpApplicationTest.java                绑定地址和默认安全配置
    proxy/api/HttpProxyControllerTest.java    接口契约与错误映射
    proxy/client/LimitedHttpClientTest.java   转发、超时和响应体限制
    proxy/security/                           目标地址和请求头策略
```

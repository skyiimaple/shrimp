package shrimp.proxy.api;

import shrimp.proxy.client.ResponseTooLargeException;
import shrimp.proxy.client.TooManyRedirectsException;
import shrimp.proxy.client.UpstreamConnectionException;
import shrimp.proxy.client.UpstreamTimeoutException;
import shrimp.proxy.security.BlockedTargetException;
import shrimp.proxy.security.DnsResolutionException;
import shrimp.proxy.security.InvalidHeaderException;
import shrimp.proxy.security.InvalidTargetException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ProxyExceptionHandler {
    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class,
            InvalidTargetException.class, InvalidHeaderException.class})
    public ResponseEntity<ApiError> invalidRequest(Exception ignored) {
        return error(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "请求参数无效");
    }

    @ExceptionHandler(BlockedTargetException.class)
    public ResponseEntity<ApiError> blocked(BlockedTargetException ignored) {
        return error(HttpStatus.FORBIDDEN, "TARGET_BLOCKED", "目标地址不允许访问");
    }

    @ExceptionHandler(DnsResolutionException.class)
    public ResponseEntity<ApiError> dnsFailure(DnsResolutionException ignored) {
        return error(HttpStatus.BAD_GATEWAY, "DNS_RESOLUTION_FAILED", "目标主机解析失败");
    }

    @ExceptionHandler(UpstreamTimeoutException.class)
    public ResponseEntity<ApiError> timeout(UpstreamTimeoutException ignored) {
        return error(HttpStatus.GATEWAY_TIMEOUT, "UPSTREAM_TIMEOUT", "上游请求超时");
    }

    @ExceptionHandler(UpstreamConnectionException.class)
    public ResponseEntity<ApiError> connectionFailure(UpstreamConnectionException ignored) {
        return error(HttpStatus.BAD_GATEWAY, "UPSTREAM_CONNECTION_FAILED", "无法连接上游服务");
    }

    @ExceptionHandler(ResponseTooLargeException.class)
    public ResponseEntity<ApiError> tooLarge(ResponseTooLargeException ignored) {
        return error(HttpStatus.BAD_GATEWAY, "RESPONSE_TOO_LARGE", "上游响应体超过大小限制");
    }

    @ExceptionHandler(TooManyRedirectsException.class)
    public ResponseEntity<ApiError> redirects(TooManyRedirectsException ignored) {
        return error(HttpStatus.BAD_GATEWAY, "TOO_MANY_REDIRECTS", "上游重定向次数过多");
    }

    private ResponseEntity<ApiError> error(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(new ApiError(code, message));
    }
}

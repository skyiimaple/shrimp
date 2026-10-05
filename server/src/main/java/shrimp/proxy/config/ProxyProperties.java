package shrimp.proxy.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.ConstructorBinding;

import java.time.Duration;

@ConfigurationProperties("shrimp.proxy")
public record ProxyProperties(Duration timeout, long maxRequestBytes, long maxResponseBytes,
                              int maxRedirects, int maxRequestHeaders, long maxRequestHeaderBytes,
                              int maxResponseHeaders, int maxResponseHeaderLineLength,
                              long maxRequestEnvelopeBytes) {
    public ProxyProperties(Duration timeout, long maxRequestBytes, long maxResponseBytes,
                           int maxRedirects, int maxRequestHeaders, long maxRequestHeaderBytes,
                           int maxResponseHeaders, int maxResponseHeaderLineLength) {
        this(timeout, maxRequestBytes, maxResponseBytes, maxRedirects, maxRequestHeaders,
                maxRequestHeaderBytes, maxResponseHeaders, maxResponseHeaderLineLength, maxRequestBytes);
    }

    @ConstructorBinding
    public ProxyProperties {
        if (timeout == null || timeout.isZero() || timeout.isNegative()) {
            throw new IllegalArgumentException("代理超时必须大于零");
        }
        if (maxResponseBytes <= 0) {
            throw new IllegalArgumentException("响应体大小限制必须大于零");
        }
        if (maxRequestBytes <= 0 || maxRequestBytes >= Integer.MAX_VALUE) {
            throw new IllegalArgumentException("请求体大小限制必须在 1 字节至 2 GiB 之间");
        }
        if (maxRequestEnvelopeBytes <= 0 || maxRequestEnvelopeBytes >= Integer.MAX_VALUE) {
            throw new IllegalArgumentException("入站 JSON 大小限制必须在 1 字节至 2 GiB 之间");
        }
        if (maxRedirects < 0) {
            throw new IllegalArgumentException("重定向次数不能为负数");
        }
        if (maxRequestHeaders <= 0) {
            throw new IllegalArgumentException("自定义请求头数量限制必须大于零");
        }
        if (maxRequestHeaderBytes <= 0) {
            throw new IllegalArgumentException("自定义请求头字节限制必须大于零");
        }
        if (maxResponseHeaders <= 0 || maxResponseHeaders == Integer.MAX_VALUE
                || maxResponseHeaderLineLength <= 0
                || maxResponseHeaderLineLength >= Integer.MAX_VALUE - 1) {
            throw new IllegalArgumentException("上游响应头限制必须大于零");
        }
    }
}

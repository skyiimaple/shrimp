package shrimp.proxy.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties("shrimp.proxy")
public record ProxyProperties(Duration timeout, long maxResponseBytes, int maxRedirects) {
    public ProxyProperties {
        if (timeout == null || timeout.isZero() || timeout.isNegative()) {
            throw new IllegalArgumentException("代理超时必须大于零");
        }
        if (maxResponseBytes <= 0) {
            throw new IllegalArgumentException("响应体大小限制必须大于零");
        }
        if (maxRedirects < 0) {
            throw new IllegalArgumentException("重定向次数不能为负数");
        }
    }
}

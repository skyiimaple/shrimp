package shrimp.proxy.security;

public class DnsResolutionException extends RuntimeException {
    public DnsResolutionException(Throwable cause) {
        super("目标主机解析失败", cause);
    }

    public DnsResolutionException() {
        super("目标主机解析失败");
    }
}

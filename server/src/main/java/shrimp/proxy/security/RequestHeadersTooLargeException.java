package shrimp.proxy.security;

public class RequestHeadersTooLargeException extends RuntimeException {
    public RequestHeadersTooLargeException() {
        super("自定义请求头超过大小限制");
    }
}

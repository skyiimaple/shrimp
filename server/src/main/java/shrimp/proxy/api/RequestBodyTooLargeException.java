package shrimp.proxy.api;

public class RequestBodyTooLargeException extends RuntimeException {
    public RequestBodyTooLargeException() {
        super("请求体超过大小限制");
    }
}

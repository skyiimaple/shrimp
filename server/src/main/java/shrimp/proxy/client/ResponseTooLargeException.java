package shrimp.proxy.client;

public class ResponseTooLargeException extends RuntimeException {
    public ResponseTooLargeException() {
        super("上游响应体超过大小限制");
    }
}

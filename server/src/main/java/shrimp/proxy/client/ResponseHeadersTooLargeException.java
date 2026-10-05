package shrimp.proxy.client;

public class ResponseHeadersTooLargeException extends RuntimeException {
    public ResponseHeadersTooLargeException() {
        super("上游响应头超过大小限制");
    }
}

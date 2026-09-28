package shrimp.proxy.client;

public class UpstreamTimeoutException extends RuntimeException {
    public UpstreamTimeoutException(Throwable cause) {
        super("上游请求超时", cause);
    }

    public UpstreamTimeoutException() {
        super("上游请求超时");
    }
}

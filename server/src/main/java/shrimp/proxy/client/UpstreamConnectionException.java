package shrimp.proxy.client;

public class UpstreamConnectionException extends RuntimeException {
    public UpstreamConnectionException(Throwable cause) {
        super("无法连接上游服务", cause);
    }
}

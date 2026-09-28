package shrimp.proxy.security;

public class BlockedTargetException extends RuntimeException {
    public BlockedTargetException() {
        super("目标地址不允许访问");
    }
}

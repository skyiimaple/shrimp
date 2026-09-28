package shrimp.proxy.security;

public class InvalidTargetException extends RuntimeException {
    public InvalidTargetException(String message) {
        super(message);
    }

    public InvalidTargetException(String message, Throwable cause) {
        super(message, cause);
    }
}

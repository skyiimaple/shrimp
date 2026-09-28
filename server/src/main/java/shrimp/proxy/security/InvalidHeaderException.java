package shrimp.proxy.security;

public class InvalidHeaderException extends RuntimeException {
    public InvalidHeaderException(String message) {
        super(message);
    }
}

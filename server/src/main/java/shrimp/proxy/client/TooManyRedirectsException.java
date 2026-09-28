package shrimp.proxy.client;

public class TooManyRedirectsException extends RuntimeException {
    public TooManyRedirectsException() {
        super("上游重定向次数过多");
    }
}

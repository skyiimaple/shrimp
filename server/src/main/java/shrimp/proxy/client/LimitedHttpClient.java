package shrimp.proxy.client;

import shrimp.proxy.api.HttpSendRequest;
import shrimp.proxy.api.HttpSendResponse;
import shrimp.proxy.config.ProxyProperties;
import shrimp.proxy.security.HeaderSanitizer;
import shrimp.proxy.security.TargetValidator;
import shrimp.proxy.security.ValidatedTarget;
import shrimp.proxy.api.RequestBodyTooLargeException;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.time.Duration;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.Semaphore;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.TimeUnit;

@Service
public class LimitedHttpClient {
    private static final int MAX_CONCURRENT_DNS_VALIDATIONS = 16;
    private static final Set<String> CROSS_ORIGIN_CREDENTIAL_HEADERS = Set.of(
            "authorization", "cookie", "cookie2", "x-api-key", "x-auth-token",
            "x-access-token", "x-authorization");
    private final ProxyProperties properties;
    private final TargetValidator targetValidator;
    private final HeaderSanitizer headerSanitizer;
    private final PinnedHttpTransport transport;
    private final ExecutorService dnsExecutor;
    private final Semaphore dnsSlots = new Semaphore(MAX_CONCURRENT_DNS_VALIDATIONS);

    public LimitedHttpClient(
            ProxyProperties properties,
            TargetValidator targetValidator,
            HeaderSanitizer headerSanitizer,
            PinnedHttpTransport transport) {
        this.properties = properties;
        this.targetValidator = targetValidator;
        this.headerSanitizer = headerSanitizer;
        this.transport = transport;
        this.dnsExecutor = Executors.newFixedThreadPool(
                MAX_CONCURRENT_DNS_VALIDATIONS, daemonThreadFactory());
    }

    public HttpSendResponse send(HttpSendRequest input) {
        var startedAt = System.nanoTime();
        var deadline = startedAt + properties.timeout().toNanos();
        var uri = parseUri(input.url());
        var method = input.method().toUpperCase(Locale.ROOT);
        var body = input.decodedBody();
        if (body != null && body.length > properties.maxRequestBytes()) {
            throw new RequestBodyTooLargeException();
        }
        var headers = headerSanitizer.sanitize(input.headers());
        int redirects = 0;
        URI previousHop = null;

        while (true) {
            var target = validate(uri, deadline);
            if (previousHop != null && !sameOrigin(previousHop, target.uri())) {
                headers.keySet().removeIf(name -> CROSS_ORIGIN_CREDENTIAL_HEADERS.contains(
                        name.toLowerCase(Locale.ROOT)));
            }
            var response = transport.send(target, method, headers, body,
                    remaining(deadline), properties.maxResponseBytes(),
                    properties.maxResponseHeaders(), properties.maxResponseHeaderLineLength());
            if (response.location() != null) {
                if (redirects++ >= properties.maxRedirects()) {
                    throw new TooManyRedirectsException();
                }
                previousHop = target.uri();
                uri = target.uri().resolve(response.location());
                if (response.status() == 303 || ((response.status() == 301 || response.status() == 302)
                        && method.equals("POST"))) {
                    method = "GET";
                    body = null;
                }
                continue;
            }
            var elapsedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt);
            return new HttpSendResponse(response.status(), response.headers(),
                    response.body().body(), response.body().encoding(), elapsedMs);
        }
    }

    private ValidatedTarget validate(URI uri, long deadline) {
        boolean acquired;
        try {
            acquired = dnsSlots.tryAcquire(remaining(deadline).toNanos(), TimeUnit.NANOSECONDS);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new UpstreamTimeoutException(exception);
        }
        if (!acquired) {
            throw new UpstreamTimeoutException();
        }

        Future<ValidatedTarget> future;
        try {
            future = dnsExecutor.submit(() -> {
                try {
                    return targetValidator.validate(uri);
                } finally {
                    dnsSlots.release();
                }
            });
        } catch (RejectedExecutionException exception) {
            dnsSlots.release();
            throw new UpstreamTimeoutException(exception);
        }

        try {
            return future.get(remaining(deadline).toNanos(), TimeUnit.NANOSECONDS);
        } catch (TimeoutException exception) {
            future.cancel(true);
            throw new UpstreamTimeoutException(exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            future.cancel(true);
            throw new UpstreamTimeoutException(exception);
        } catch (ExecutionException exception) {
            var cause = exception.getCause();
            if (cause instanceof RuntimeException runtimeException) {
                throw runtimeException;
            }
            throw new UpstreamConnectionException(cause);
        }
    }

    @PreDestroy
    void shutdownDnsExecutor() {
        dnsExecutor.shutdownNow();
    }

    private static ThreadFactory daemonThreadFactory() {
        var sequence = new AtomicInteger();
        return runnable -> {
            var thread = new Thread(runnable, "shrimp-dns-" + sequence.incrementAndGet());
            thread.setDaemon(true);
            return thread;
        };
    }

    private boolean sameOrigin(URI left, URI right) {
        return left.getScheme().equalsIgnoreCase(right.getScheme())
                && left.getHost().equalsIgnoreCase(right.getHost())
                && effectivePort(left) == effectivePort(right);
    }

    private int effectivePort(URI uri) {
        return uri.getPort() == -1 ? ("https".equalsIgnoreCase(uri.getScheme()) ? 443 : 80) : uri.getPort();
    }

    private Duration remaining(long deadline) {
        var nanos = deadline - System.nanoTime();
        if (nanos <= 0) {
            throw new UpstreamTimeoutException();
        }
        return Duration.ofNanos(nanos);
    }

    private URI parseUri(String value) {
        try {
            return URI.create(value);
        } catch (IllegalArgumentException exception) {
            throw new shrimp.proxy.security.InvalidTargetException("URL 无效", exception);
        }
    }

}

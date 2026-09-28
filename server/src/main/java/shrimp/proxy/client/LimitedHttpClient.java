package shrimp.proxy.client;

import shrimp.proxy.api.HttpSendRequest;
import shrimp.proxy.api.HttpSendResponse;
import shrimp.proxy.config.ProxyProperties;
import shrimp.proxy.security.HeaderSanitizer;
import shrimp.proxy.security.TargetValidator;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Service
public class LimitedHttpClient {
    private final ProxyProperties properties;
    private final TargetValidator targetValidator;
    private final HeaderSanitizer headerSanitizer;
    private final HttpClient httpClient;
    private final ResponseBodyReader bodyReader = new ResponseBodyReader();

    public LimitedHttpClient(
            ProxyProperties properties,
            TargetValidator targetValidator,
            HeaderSanitizer headerSanitizer) {
        this.properties = properties;
        this.targetValidator = targetValidator;
        this.headerSanitizer = headerSanitizer;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(properties.timeout())
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
    }

    public HttpSendResponse send(HttpSendRequest input) {
        var startedAt = System.nanoTime();
        var deadline = startedAt + properties.timeout().toNanos();
        var uri = parseUri(input.url());
        var method = input.method().toUpperCase(Locale.ROOT);
        var body = input.body();
        var headers = headerSanitizer.sanitize(input.headers());
        int redirects = 0;

        while (true) {
            var target = targetValidator.validate(uri);
            var request = buildRequest(target.uri(), method, body, headers, remaining(deadline));
            HttpResponse<java.io.InputStream> response;
            try {
                response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
            } catch (HttpTimeoutException exception) {
                throw new UpstreamTimeoutException(exception);
            } catch (IOException exception) {
                throw new UpstreamConnectionException(exception);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new UpstreamConnectionException(exception);
            }

            var location = response.headers().firstValue("location");
            if (isRedirect(response.statusCode()) && location.isPresent()) {
                closeQuietly(response.body());
                if (redirects++ >= properties.maxRedirects()) {
                    throw new TooManyRedirectsException();
                }
                uri = target.uri().resolve(location.get());
                if (response.statusCode() == 303 || ((response.statusCode() == 301 || response.statusCode() == 302)
                        && method.equals("POST"))) {
                    method = "GET";
                    body = null;
                }
                continue;
            }

            var encodedBody = readBody(response, deadline);
            var elapsedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt);
            return new HttpSendResponse(response.statusCode(), normalizeHeaders(response.headers().map()),
                    encodedBody.body(), encodedBody.encoding(), elapsedMs);
        }
    }

    private ResponseBodyReader.EncodedBody readBody(HttpResponse<java.io.InputStream> response, long deadline) {
        var remaining = remaining(deadline);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var future = executor.submit(() -> {
                try (var body = response.body()) {
                    return bodyReader.read(body, properties.maxResponseBytes(),
                            response.headers().firstValue("content-type"));
                }
            });
            return future.get(remaining.toNanos(), TimeUnit.NANOSECONDS);
        } catch (TimeoutException exception) {
            closeQuietly(response.body());
            throw new UpstreamTimeoutException(exception);
        } catch (ExecutionException exception) {
            if (exception.getCause() instanceof ResponseTooLargeException tooLarge) {
                throw tooLarge;
            }
            if (exception.getCause() instanceof IOException ioException) {
                throw new UpstreamConnectionException(ioException);
            }
            throw new UpstreamConnectionException(exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new UpstreamConnectionException(exception);
        }
    }

    private HttpRequest buildRequest(URI uri, String method, String body,
                                     org.springframework.http.HttpHeaders headers, Duration timeout) {
        var builder = HttpRequest.newBuilder(uri).timeout(timeout);
        headers.forEach((name, values) -> values.forEach(value -> builder.header(name, value)));
        var publisher = body == null
                ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8);
        return builder.method(method, publisher).build();
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

    private boolean isRedirect(int status) {
        return status == 301 || status == 302 || status == 303 || status == 307 || status == 308;
    }

    private Map<String, List<String>> normalizeHeaders(Map<String, List<String>> headers) {
        var result = new LinkedHashMap<String, List<String>>();
        headers.forEach((name, values) -> result.put(name.toLowerCase(Locale.ROOT), List.copyOf(values)));
        return Map.copyOf(result);
    }

    private void closeQuietly(java.io.InputStream stream) {
        try {
            stream.close();
        } catch (IOException ignored) {
            // Closing a discarded response is best-effort.
        }
    }
}

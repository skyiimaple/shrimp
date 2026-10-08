package shrimp.proxy.client;

import org.apache.hc.client5.http.DnsResolver;
import org.apache.hc.client5.http.classic.methods.HttpUriRequestBase;
import org.apache.hc.client5.http.config.ConnectionConfig;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.config.TlsConfig;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.client5.http.impl.io.ManagedHttpClientConnectionFactory;
import org.apache.hc.client5.http.impl.routing.DefaultRoutePlanner;
import org.apache.hc.client5.http.ssl.ClientTlsStrategyBuilder;
import org.apache.hc.client5.http.ssl.HostnameVerificationPolicy;
import org.apache.hc.client5.http.ssl.TlsSocketStrategy;
import org.apache.hc.client5.http.protocol.HttpClientContext;
import org.apache.hc.core5.http.Header;
import org.apache.hc.core5.http.HttpHost;
import org.apache.hc.core5.http.MessageConstraintException;
import org.apache.hc.core5.http.config.Http1Config;
import org.apache.hc.core5.http.io.entity.ByteArrayEntity;
import org.apache.hc.core5.io.CloseMode;
import org.apache.hc.core5.util.Timeout;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import shrimp.proxy.security.ValidatedTarget;

import javax.net.ssl.SSLContext;
import java.io.IOException;
import java.io.InputStream;
import java.io.InterruptedIOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Component
public class PinnedHttpTransport {
    private static final int MAX_CONCURRENT_UPSTREAM_REQUESTS = 128;
    private final TlsSocketStrategy tlsStrategy;
    private final Semaphore upstreamSlots;
    private final ResponseBodyReader bodyReader = new ResponseBodyReader();

    public PinnedHttpTransport() {
        this(ClientTlsStrategyBuilder.create()
                .setHostVerificationPolicy(HostnameVerificationPolicy.BOTH)
                .buildClassic(), new Semaphore(MAX_CONCURRENT_UPSTREAM_REQUESTS));
    }

    PinnedHttpTransport(SSLContext context) {
        this(ClientTlsStrategyBuilder.create()
                .setSslContext(context)
                .setHostVerificationPolicy(HostnameVerificationPolicy.BOTH)
                .buildClassic(), new Semaphore(MAX_CONCURRENT_UPSTREAM_REQUESTS));
    }

    PinnedHttpTransport(SSLContext context, Semaphore upstreamSlots) {
        this(ClientTlsStrategyBuilder.create()
                .setSslContext(context)
                .setHostVerificationPolicy(HostnameVerificationPolicy.BOTH)
                .buildClassic(), upstreamSlots);
    }

    PinnedHttpTransport(Semaphore upstreamSlots) {
        this(ClientTlsStrategyBuilder.create()
                .setHostVerificationPolicy(HostnameVerificationPolicy.BOTH)
                .buildClassic(), upstreamSlots);
    }

    private PinnedHttpTransport(TlsSocketStrategy tlsStrategy, Semaphore upstreamSlots) {
        this.tlsStrategy = tlsStrategy;
        this.upstreamSlots = upstreamSlots;
    }

    public HopResponse send(ValidatedTarget target, String method, HttpHeaders headers,
                            byte[] body, Duration remaining, long maxResponseBytes,
                            int maxResponseHeaders, int maxResponseHeaderLineLength) {
        try {
            if (!upstreamSlots.tryAcquire(remaining.toNanos(), TimeUnit.NANOSECONDS)) {
                throw new UpstreamTimeoutException();
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new UpstreamTimeoutException(exception);
        }
        try {
            return sendWithSlot(target, method, headers, body, remaining, maxResponseBytes,
                    maxResponseHeaders, maxResponseHeaderLineLength);
        } finally {
            upstreamSlots.release();
        }
    }

    private HopResponse sendWithSlot(ValidatedTarget target, String method, HttpHeaders headers,
                                     byte[] body, Duration remaining, long maxResponseBytes,
                                     int maxResponseHeaders, int maxResponseHeaderLineLength) {
        var timeout = Timeout.ofMilliseconds(Math.max(1, remaining.toMillis()));
        // HttpCore rejects at the configured count and includes CR before LF in its raw line-length check.
        var http1Config = Http1Config.custom()
                .setMaxHeaderCount(maxResponseHeaders + 1)
                .setMaxLineLength(maxResponseHeaderLineLength + 2)
                .build();
        var manager = PoolingHttpClientConnectionManagerBuilder.create()
                .setConnectionFactory(ManagedHttpClientConnectionFactory.builder()
                        .http1Config(http1Config).build())
                .setDnsResolver(new PinnedDnsResolver(target))
                .setTlsSocketStrategy(tlsStrategy)
                .setDefaultConnectionConfig(ConnectionConfig.custom()
                        .setConnectTimeout(timeout)
                        .setSocketTimeout(timeout)
                        .build())
                .setDefaultTlsConfig(TlsConfig.custom().setHandshakeTimeout(timeout).build())
                .build();
        var client = HttpClients.custom()
                .setConnectionManager(manager)
                .setRoutePlanner(new DefaultRoutePlanner(null))
                .disableRedirectHandling()
                .disableAutomaticRetries()
                .disableContentCompression()
                .disableCookieManagement()
                .disableAuthCaching()
                .build();
        var request = new HttpUriRequestBase(method, target.uri());
        request.setConfig(RequestConfig.custom()
                .setResponseTimeout(timeout)
                .setConnectionRequestTimeout(timeout)
                .build());
        headers.forEach((name, values) -> values.forEach(value -> request.addHeader(name, value)));
        if (body != null) {
            request.setEntity(new ByteArrayEntity(body, null));
        }
        var executor = Executors.newVirtualThreadPerTaskExecutor();
        try {
            var future = executor.submit(() -> execute(client, target, request, maxResponseBytes));
            try {
                return future.get(remaining.toNanos(), TimeUnit.NANOSECONDS);
            } catch (TimeoutException exception) {
                request.cancel();
                future.cancel(true);
                throw new UpstreamTimeoutException(exception);
            } catch (ExecutionException exception) {
                var cause = exception.getCause();
                if (cause instanceof ResponseTooLargeException tooLarge) {
                    throw tooLarge;
                }
                if (containsMessageConstraint(cause)) {
                    throw new ResponseHeadersTooLargeException();
                }
                if (cause instanceof SocketTimeoutException || cause instanceof InterruptedIOException) {
                    throw new UpstreamTimeoutException(cause);
                }
                throw new UpstreamConnectionException(cause);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                request.cancel();
                future.cancel(true);
                throw new UpstreamConnectionException(exception);
            }
        } finally {
            client.close(CloseMode.IMMEDIATE);
            executor.shutdownNow();
        }
    }

    private boolean containsMessageConstraint(Throwable exception) {
        for (var cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof MessageConstraintException) {
                return true;
            }
        }
        return false;
    }

    private HopResponse execute(org.apache.hc.client5.http.impl.classic.CloseableHttpClient client,
                                ValidatedTarget target, HttpUriRequestBase request, long maxResponseBytes)
            throws IOException {
        var uri = target.uri();
        var port = uri.getPort() == -1 ? ("https".equals(uri.getScheme()) ? 443 : 80) : uri.getPort();
        var originalHost = new HttpHost(uri.getScheme(), uri.getHost(), port);
        try (var response = client.executeOpen(originalHost, request, HttpClientContext.create())) {
            var headers = normalizeHeaders(response.getHeaders());
            var location = response.getFirstHeader("Location");
            if (isRedirect(response.getCode()) && location != null) {
                return new HopResponse(response.getCode(), headers, null, location.getValue());
            }
            var entity = response.getEntity();
            try (var input = entity == null ? InputStream.nullInputStream() : entity.getContent()) {
                var encoded = bodyReader.read(input, maxResponseBytes,
                        java.util.Optional.ofNullable(response.getFirstHeader("Content-Type"))
                                .map(Header::getValue));
                return new HopResponse(response.getCode(), headers, encoded, null);
            }
        }
    }

    private Map<String, List<String>> normalizeHeaders(Header[] headers) {
        var result = new LinkedHashMap<String, List<String>>();
        for (var header : headers) {
            result.computeIfAbsent(header.getName().toLowerCase(Locale.ROOT), ignored -> new ArrayList<>())
                    .add(header.getValue());
        }
        result.replaceAll((name, values) -> List.copyOf(values));
        return Map.copyOf(result);
    }

    private boolean isRedirect(int status) {
        return status == 301 || status == 302 || status == 303 || status == 307 || status == 308;
    }

    public record HopResponse(int status, Map<String, List<String>> headers,
                              ResponseBodyReader.EncodedBody body, String location) {
    }

    private static final class PinnedDnsResolver implements DnsResolver {
        private final String hostname;
        private final InetAddress[] addresses;

        private PinnedDnsResolver(ValidatedTarget target) {
            this.hostname = target.uri().getHost();
            this.addresses = target.addresses().toArray(InetAddress[]::new);
        }

        @Override
        public InetAddress[] resolve(String host) throws UnknownHostException {
            verifyHost(host);
            return addresses.clone();
        }

        @Override
        public List<InetSocketAddress> resolve(String host, int port) throws UnknownHostException {
            verifyHost(host);
            return java.util.Arrays.stream(addresses)
                    .map(address -> new InetSocketAddress(address, port))
                    .toList();
        }

        @Override
        public String resolveCanonicalHostname(String host) throws UnknownHostException {
            verifyHost(host);
            return hostname;
        }

        private void verifyHost(String host) throws UnknownHostException {
            if (!hostname.equalsIgnoreCase(host)) {
                throw new UnknownHostException(host);
            }
        }
    }
}

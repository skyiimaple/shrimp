package shrimp.proxy.client;

import shrimp.proxy.api.HttpSendRequest;
import shrimp.proxy.config.ProxyProperties;
import shrimp.proxy.security.HeaderSanitizer;
import shrimp.proxy.security.TargetValidator;
import shrimp.proxy.security.ValidatedTarget;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.tls.HandshakeCertificates;
import okhttp3.tls.HeldCertificate;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.InetAddress;
import java.net.URI;
import java.net.Socket;
import java.net.ServerSocket;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import javax.net.ssl.ExtendedSSLSession;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SNIServerName;
import javax.net.ssl.SNIHostName;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LimitedHttpClientTest {
    private MockWebServer server;
    private SniRecordingSocketFactory sniRecorder;

    @BeforeEach
    void startServer() throws Exception {
        server = new MockWebServer();
        server.start();
    }

    @AfterEach
    void stopServer() throws Exception {
        server.shutdown();
    }

    @Test
    void forwardsMethodHeadersAndUtf8Body() throws Exception {
        server.enqueue(new MockResponse().setResponseCode(201)
                .addHeader("Content-Type", "text/plain; charset=utf-8")
                .setBody("已创建"));
        var client = client(Duration.ofSeconds(2), 1024, 5, validator());

        var response = client.send(new HttpSendRequest(
                server.url("/items").toString(), "POST",
                Map.of("Content-Type", "application/json", "X-Test", "yes"), "{\"name\":\"虾\"}"));

        var request = server.takeRequest();
        assertThat(request.getMethod()).isEqualTo("POST");
        assertThat(request.getHeader("X-Test")).isEqualTo("yes");
        assertThat(request.getBody().readUtf8()).isEqualTo("{\"name\":\"虾\"}");
        assertThat(response.status()).isEqualTo(201);
        assertThat(response.body()).isEqualTo("已创建");
        assertThat(response.bodyEncoding()).isEqualTo("text");
        assertThat(response.durationMs()).isNotNegative();
    }

    @Test
    void preservesBodyOnGetRequest() throws Exception {
        try (var rawServer = new ServerSocket(0)) {
            var received = new AtomicReference<String>();
            var exchange = Thread.ofVirtual().start(() -> {
                try (var socket = rawServer.accept()) {
                    var input = socket.getInputStream();
                    var headerBytes = new java.io.ByteArrayOutputStream();
                    while (!headerBytes.toString(StandardCharsets.ISO_8859_1).endsWith("\r\n\r\n")) {
                        headerBytes.write(input.read());
                    }
                    var body = input.readNBytes(5);
                    received.set(new String(body, StandardCharsets.UTF_8));
                    socket.getOutputStream().write("HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nok"
                            .getBytes(StandardCharsets.US_ASCII));
                } catch (Exception exception) {
                    throw new RuntimeException(exception);
                }
            });
            var result = client(Duration.ofSeconds(2), 1024, 5, validator()).send(new HttpSendRequest(
                    "http://127.0.0.1:" + rawServer.getLocalPort() + "/get-body", "GET", Map.of(), "hello"));
            exchange.join();
            assertThat(result.body()).isEqualTo("ok");
            assertThat(received.get()).isEqualTo("hello");
        }
    }

    @Test
    void encodesInvalidUtf8AsBase64() {
        server.enqueue(new MockResponse().addHeader("Content-Type", "application/octet-stream")
                .setBody(new okio.Buffer().write(new byte[]{(byte) 0xc3, 0x28})));

        var response = client(Duration.ofSeconds(2), 1024, 5, validator()).send(
                new HttpSendRequest(server.url("/binary").toString(), "GET", Map.of(), null));

        assertThat(response.bodyEncoding()).isEqualTo("base64");
        assertThat(response.body()).isEqualTo("wyg=");
    }

    @Test
    void rejectsResponseBeyondConfiguredLimit() {
        server.enqueue(new MockResponse().setBody("12345"));

        assertThatThrownBy(() -> client(Duration.ofSeconds(2), 4, 5, validator()).send(
                new HttpSendRequest(server.url("/large").toString(), "GET", Map.of(), null)))
                .isInstanceOf(ResponseTooLargeException.class);
    }

    @Test
    void enforcesTotalTimeoutWhileReadingResponse() {
        server.enqueue(new MockResponse().setBody("late")
                .setBodyDelay(500, TimeUnit.MILLISECONDS));

        assertThatThrownBy(() -> client(Duration.ofMillis(100), 1024, 5, validator()).send(
                new HttpSendRequest(server.url("/slow").toString(), "GET", Map.of(), null)))
                .isInstanceOf(UpstreamTimeoutException.class);
    }

    @Test
    void revalidatesEveryRedirectAndHonorsRedirectLimit() {
        server.enqueue(new MockResponse().setResponseCode(302).addHeader("Location", "/next"));
        server.enqueue(new MockResponse().setResponseCode(200).setBody("ok"));
        var validator = validator();

        var response = client(Duration.ofSeconds(2), 1024, 1, validator).send(
                new HttpSendRequest(server.url("/start").toString(), "GET", Map.of(), null));

        assertThat(response.body()).isEqualTo("ok");
        assertThat(validator.calls()).isEqualTo(2);
    }

    @Test
    void enforcesTotalTimeoutWhileDnsResolutionIsBlocked() throws Exception {
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var validator = new TargetValidator(host -> {
            entered.countDown();
            try {
                release.await(500, TimeUnit.MILLISECONDS);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
            }
            return new InetAddress[]{InetAddress.getLoopbackAddress()};
        });
        var client = client(Duration.ofMillis(100), 1024, 5, validator);
        var started = System.nanoTime();

        assertThatThrownBy(() -> client.send(new HttpSendRequest(
                "http://blocked-dns.invalid/slow", "GET", Map.of(), null)))
                .isInstanceOf(UpstreamTimeoutException.class);

        assertThat(entered.await(1, TimeUnit.SECONDS)).isTrue();
        assertThat(Duration.ofNanos(System.nanoTime() - started).toMillis()).isLessThan(400);
        release.countDown();
    }

    @Test
    void appliesTotalTimeoutToDnsResolutionOnRedirect() throws Exception {
        server.enqueue(new MockResponse().setResponseCode(302)
                .addHeader("Location", "http://blocked-dns.invalid:" + server.getPort() + "/next"));
        var calls = new AtomicInteger();
        var release = new CountDownLatch(1);
        var validator = new TargetValidator(host -> {
            if (calls.incrementAndGet() > 1) {
                try {
                    release.await(500, TimeUnit.MILLISECONDS);
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                }
            }
            return new InetAddress[]{InetAddress.getLoopbackAddress()};
        });
        var client = client(Duration.ofMillis(150), 1024, 1, validator);

        assertThatThrownBy(() -> client.send(new HttpSendRequest(
                server.url("/start").toString(), "GET", Map.of(), null)))
                .isInstanceOf(UpstreamTimeoutException.class);

        assertThat(server.getRequestCount()).isEqualTo(1);
        assertThat(calls.get()).isEqualTo(2);
        release.countDown();
    }

    @Test
    void boundsConcurrentUpstreamRequestsBeforeAllocatingPerRequestResources() throws Exception {
        server.enqueue(new MockResponse().setBody("slow")
                .setBodyDelay(500, TimeUnit.MILLISECONDS));
        var transport = new PinnedHttpTransport(new Semaphore(1));
        var first = client(Duration.ofSeconds(2), 1024, 5, validator(), transport);
        var second = client(Duration.ofMillis(100), 1024, 5, validator(), transport);

        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var firstRequest = executor.submit(() -> first.send(new HttpSendRequest(
                    server.url("/first").toString(), "GET", Map.of(), null)));
            assertThat(server.takeRequest(1, TimeUnit.SECONDS)).isNotNull();

            assertThatThrownBy(() -> second.send(new HttpSendRequest(
                    server.url("/second").toString(), "GET", Map.of(), null)))
                    .isInstanceOf(UpstreamTimeoutException.class);
            assertThat(firstRequest.get(2, TimeUnit.SECONDS).body()).isEqualTo("slow");
            assertThat(server.getRequestCount()).isEqualTo(1);
        }
    }

    @Test
    void failsWhenRedirectCountIsExceeded() {
        server.enqueue(new MockResponse().setResponseCode(302).addHeader("Location", "/again"));

        assertThatThrownBy(() -> client(Duration.ofSeconds(2), 1024, 0, validator()).send(
                new HttpSendRequest(server.url("/start").toString(), "GET", Map.of(), null)))
                .isInstanceOf(TooManyRedirectsException.class);
    }

    @Test
    void connectsToValidatedAddressWithoutResolvingHostnameAgain() throws Exception {
        server.enqueue(new MockResponse().setBody("pinned"));
        var resolutions = new AtomicInteger();
        var validator = new TargetValidator(host -> {
            resolutions.incrementAndGet();
            return new InetAddress[]{InetAddress.getByName("127.0.0.1")};
        });
        var url = "http://pinned.invalid:" + server.getPort() + "/checked";

        var response = client(Duration.ofSeconds(2), 1024, 5, validator).send(
                new HttpSendRequest(url, "GET", Map.of(), null));

        assertThat(response.body()).isEqualTo("pinned");
        assertThat(server.takeRequest().getHeader("Host")).isEqualTo("pinned.invalid:" + server.getPort());
        assertThat(resolutions.get()).isEqualTo(1);
    }

    @Test
    void revalidatesAndPinsEachRedirectHostname() throws Exception {
        var seenHosts = new java.util.ArrayList<String>();
        var validator = new TargetValidator(host -> {
            seenHosts.add(host);
            return new InetAddress[]{InetAddress.getByName("127.0.0.1")};
        });
        server.enqueue(new MockResponse().setResponseCode(302)
                .addHeader("Location", "http://second-pinned.invalid:" + server.getPort() + "/next"));
        server.enqueue(new MockResponse().setBody("redirected"));

        var result = client(Duration.ofSeconds(2), 1024, 1, validator).send(
                new HttpSendRequest("http://first-pinned.invalid:" + server.getPort() + "/start",
                        "GET", Map.of(), null));

        assertThat(result.body()).isEqualTo("redirected");
        assertThat(seenHosts).containsExactly("first-pinned.invalid", "second-pinned.invalid");
        assertThat(server.takeRequest().getHeader("Host")).isEqualTo("first-pinned.invalid:" + server.getPort());
        assertThat(server.takeRequest().getHeader("Host")).isEqualTo("second-pinned.invalid:" + server.getPort());
    }

    @Test
    void doesNotForwardCredentialsToDifferentPortOnRedirect() throws Exception {
        try (var second = new MockWebServer()) {
            second.start();
            server.enqueue(new MockResponse().setResponseCode(302)
                    .addHeader("Location", second.url("/next").toString()));
            second.enqueue(new MockResponse().setBody("redirected"));
            var validator = new TargetValidator(host -> new InetAddress[]{InetAddress.getLoopbackAddress()});
            var headers = Map.of(
                    "aUtHoRiZaTiOn", "Bearer secret",
                    "cOoKiE", "session=secret",
                    "Cookie2", "legacy=secret",
                    "X-Api-Key", "api-secret",
                    "X-Auth-Token", "token-secret",
                    "X-Request-Id", "safe-id");

            var result = client(Duration.ofSeconds(2), 1024, 1, validator).send(
                    new HttpSendRequest(server.url("/start").toString(), "GET", headers, null));

            var firstRequest = server.takeRequest();
            var secondRequest = second.takeRequest();
            assertThat(result.body()).isEqualTo("redirected");
            assertThat(firstRequest.getHeader("Authorization")).isEqualTo("Bearer secret");
            assertThat(firstRequest.getHeader("Cookie")).isEqualTo("session=secret");
            assertThat(firstRequest.getHeader("X-Api-Key")).isEqualTo("api-secret");
            assertThat(firstRequest.getHeader("Cookie2")).isEqualTo("legacy=secret");
            assertThat(firstRequest.getHeader("X-Auth-Token")).isEqualTo("token-secret");
            assertThat(secondRequest.getHeader("Authorization")).isNull();
            assertThat(secondRequest.getHeader("Cookie")).isNull();
            assertThat(secondRequest.getHeader("X-Api-Key")).isNull();
            assertThat(secondRequest.getHeader("Cookie2")).isNull();
            assertThat(secondRequest.getHeader("X-Auth-Token")).isNull();
            assertThat(secondRequest.getHeader("X-Request-Id")).isEqualTo("safe-id");
        }
    }

    @Test
    void keepsCredentialsOnSameOriginRedirect() throws Exception {
        server.enqueue(new MockResponse().setResponseCode(302).addHeader("Location", "/next"));
        server.enqueue(new MockResponse().setBody("done"));
        var validator = new TargetValidator(host -> new InetAddress[]{InetAddress.getLoopbackAddress()});

        client(Duration.ofSeconds(2), 1024, 1, validator).send(new HttpSendRequest(
                server.url("/start").toString(), "GET",
                Map.of("Authorization", "Bearer same", "Cookie", "session=same"), null));

        server.takeRequest();
        var secondRequest = server.takeRequest();
        assertThat(secondRequest.getHeader("Authorization")).isEqualTo("Bearer same");
        assertThat(secondRequest.getHeader("Cookie")).isEqualTo("session=same");
    }

    @Test
    void treatsImplicitAndExplicitDefaultPortsAsSameOrigin() throws Exception {
        for (var scheme : List.of("http", "https")) {
            var seenAuthorization = new java.util.ArrayList<String>();
            var explicitPort = scheme.equals("https") ? 443 : 80;
            var transport = new PinnedHttpTransport() {
                @Override
                public HopResponse send(ValidatedTarget target, String method,
                                        org.springframework.http.HttpHeaders headers, byte[] body, Duration remaining,
                                        long maxResponseBytes, int maxResponseHeaders,
                                        int maxResponseHeaderLineLength) {
                    seenAuthorization.add(headers.getFirst("Authorization"));
                    if (seenAuthorization.size() == 1) {
                        return new HopResponse(302, Map.of(), null,
                                scheme + "://SAME-PINNED.INVALID:" + explicitPort + "/next");
                    }
                    return new HopResponse(200, Map.of(),
                            new ResponseBodyReader.EncodedBody("done", "text"), null);
                }
            };
            var properties = new ProxyProperties(Duration.ofSeconds(2), 1048576, 1024, 1,
                    64, 16384, 100, 8192);
            var validator = new TargetValidator(host -> new InetAddress[]{InetAddress.getLoopbackAddress()});
            var client = new LimitedHttpClient(properties, validator, new HeaderSanitizer(properties), transport);

            client.send(new HttpSendRequest(scheme + "://same-pinned.invalid/start", "GET",
                    Map.of("Authorization", "Bearer same"), null));

            assertThat(seenAuthorization).as(scheme).containsExactly("Bearer same", "Bearer same");
        }
    }

    @Test
    void doesNotRestoreCredentialsAfterCrossOriginRedirectsBack() throws Exception {
        try (var second = new MockWebServer()) {
            second.start();
            server.enqueue(new MockResponse().setResponseCode(302)
                    .addHeader("Location", second.url("/middle").toString()));
            second.enqueue(new MockResponse().setResponseCode(302)
                    .addHeader("Location", server.url("/last").toString()));
            server.enqueue(new MockResponse().setBody("done"));
            var validator = new TargetValidator(host -> new InetAddress[]{InetAddress.getLoopbackAddress()});

            client(Duration.ofSeconds(2), 1024, 2, validator).send(new HttpSendRequest(
                    server.url("/start").toString(), "GET",
                    Map.of("Authorization", "Bearer secret", "Cookie", "session=secret"), null));

            assertThat(server.takeRequest().getHeader("Authorization")).isEqualTo("Bearer secret");
            assertThat(second.takeRequest().getHeader("Authorization")).isNull();
            var lastRequest = server.takeRequest();
            assertThat(lastRequest.getHeader("Authorization")).isNull();
            assertThat(lastRequest.getHeader("Cookie")).isNull();
        }
    }

    @Test
    void doesNotForwardCredentialsWhenRedirectChangesHostnameButKeepsPort() throws Exception {
        server.enqueue(new MockResponse().setResponseCode(302).addHeader("Location",
                "http://second-pinned.invalid:" + server.getPort() + "/next"));
        server.enqueue(new MockResponse().setBody("done"));
        var validator = new TargetValidator(host -> new InetAddress[]{InetAddress.getLoopbackAddress()});

        client(Duration.ofSeconds(2), 1024, 1, validator).send(new HttpSendRequest(
                "http://first-pinned.invalid:" + server.getPort() + "/start", "GET",
                Map.of("Authorization", "Bearer secret"), null));

        assertThat(server.takeRequest().getHeader("Authorization")).isEqualTo("Bearer secret");
        assertThat(server.takeRequest().getHeader("Authorization")).isNull();
    }

    @Test
    void doesNotForwardCredentialsOnHttpsToHttpDowngrade() throws Exception {
        var certificate = restartAsHttps("tls-pinned.invalid");
        try (var httpServer = new MockWebServer()) {
            httpServer.start();
            server.enqueue(new MockResponse().setResponseCode(302).addHeader("Location",
                    "http://tls-pinned.invalid:" + httpServer.getPort() + "/insecure"));
            httpServer.enqueue(new MockResponse().setBody("done"));
            var validator = new TargetValidator(host -> new InetAddress[]{InetAddress.getLoopbackAddress()});
            tlsClient(validator, trust(certificate)).send(new HttpSendRequest(
                    "https://tls-pinned.invalid:" + server.getPort() + "/secure", "GET",
                    Map.of("Authorization", "Bearer secret", "Cookie", "session=secret"), null));

            assertThat(server.takeRequest().getHeader("Authorization")).isEqualTo("Bearer secret");
            var downgraded = httpServer.takeRequest();
            assertThat(downgraded.getHeader("Authorization")).isNull();
            assertThat(downgraded.getHeader("Cookie")).isNull();
        }
    }

    @Test
    void blocksMetadataRedirectBeforeSecondConnection() throws Exception {
        server.enqueue(new MockResponse().setResponseCode(302)
                .addHeader("Location", "http://169.254.169.254/latest/meta-data"));
        var validator = new TargetValidator(host -> new InetAddress[]{InetAddress.getByName(host)});

        assertThatThrownBy(() -> client(Duration.ofSeconds(2), 1024, 1, validator).send(
                new HttpSendRequest(server.url("/start").toString(), "GET", Map.of(), null)))
                .isInstanceOf(shrimp.proxy.security.BlockedTargetException.class);
        assertThat(server.getRequestCount()).isEqualTo(1);
    }

    @Test
    void blocksDecimalMetadataAliasOnRedirectBeforeSecondConnection() throws Exception {
        server.enqueue(new MockResponse().setResponseCode(302)
                .addHeader("Location", "http://2852039166/latest/meta-data"));
        var firstUrl = server.url("/start").toString();
        var firstHost = URI.create(firstUrl).getHost();
        var seenHosts = new java.util.ArrayList<String>();
        var validator = new TargetValidator(host -> {
            seenHosts.add(host);
            return new InetAddress[]{
                    host.equals(firstHost) ? InetAddress.getLoopbackAddress()
                            : InetAddress.getByAddress(new byte[]{(byte) 169, (byte) 254, (byte) 169, (byte) 254})
            };
        });

        assertThatThrownBy(() -> client(Duration.ofSeconds(2), 1024, 1, validator).send(
                new HttpSendRequest(firstUrl, "GET", Map.of(), null)))
                .isInstanceOf(shrimp.proxy.security.BlockedTargetException.class);
        assertThat(server.getRequestCount()).isEqualTo(1);
        assertThat(seenHosts).containsExactly(firstHost, "2852039166");
    }

    @Test
    void pinsHttpsRedirectAndKeepsRedirectHostnameForHostSniAndCertificate() throws Exception {
        var certificate = restartAsHttps("tls-pinned.invalid");
        server.enqueue(new MockResponse().setBody("secure redirect"));
        var seenHosts = new java.util.ArrayList<String>();
        var validator = new TargetValidator(host -> {
            seenHosts.add(host);
            return new InetAddress[]{InetAddress.getLoopbackAddress()};
        });
        try (var first = new MockWebServer()) {
            first.enqueue(new MockResponse().setResponseCode(302).addHeader("Location",
                    "https://tls-pinned.invalid:" + server.getPort() + "/next"));
            first.start();

            var result = tlsClient(validator, trust(certificate)).send(new HttpSendRequest(
                    "http://first-pinned.invalid:" + first.getPort() + "/start", "GET", Map.of(), null));

            assertThat(result.body()).isEqualTo("secure redirect");
            assertThat(first.takeRequest().getHeader("Host")).isEqualTo("first-pinned.invalid:" + first.getPort());
            assertThat(server.takeRequest().getHeader("Host")).isEqualTo("tls-pinned.invalid:" + server.getPort());
            assertThat(sniRecorder.requestedServerName()).isEqualTo("tls-pinned.invalid");
            assertThat(seenHosts).containsExactly("first-pinned.invalid", "tls-pinned.invalid");
        }
    }

    @Test
    void httpsUsesOriginalHostnameForHostAndCertificateVerification() throws Exception {
        var certificate = restartAsHttps("tls-pinned.invalid");
        server.enqueue(new MockResponse().setBody("secure"));
        var validator = new TargetValidator(host -> new InetAddress[]{InetAddress.getByName("127.0.0.1")});

        var result = tlsClient(validator, trust(certificate)).send(new HttpSendRequest(
                "https://tls-pinned.invalid:" + server.getPort() + "/secure", "GET", Map.of(), null));

        assertThat(result.body()).isEqualTo("secure");
        assertThat(server.takeRequest().getHeader("Host")).isEqualTo("tls-pinned.invalid:" + server.getPort());
        assertThat(sniRecorder.requestedServerName()).isEqualTo("tls-pinned.invalid");
    }

    @Test
    void httpsRejectsCertificateForDifferentHostnameEvenWhenAddressIsTrusted() throws Exception {
        var certificate = restartAsHttps("different.invalid");
        server.enqueue(new MockResponse().setBody("must not return"));
        var validator = new TargetValidator(host -> new InetAddress[]{InetAddress.getByName("127.0.0.1")});

        assertThatThrownBy(() -> tlsClient(validator, trust(certificate)).send(new HttpSendRequest(
                "https://tls-pinned.invalid:" + server.getPort() + "/secure", "GET", Map.of(), null)))
                .isInstanceOf(UpstreamConnectionException.class);
    }

    private LimitedHttpClient client(Duration timeout, long maxBytes, int redirects, TargetValidator validator) {
        return client(timeout, maxBytes, redirects, validator, new PinnedHttpTransport());
    }

    private LimitedHttpClient client(Duration timeout, long maxBytes, int redirects,
                                     TargetValidator validator, PinnedHttpTransport transport) {
        var properties = new ProxyProperties(timeout, 1048576, maxBytes, redirects, 64, 16384, 100, 8192);
        return new LimitedHttpClient(properties, validator, new HeaderSanitizer(properties),
                transport);
    }

    private LimitedHttpClient tlsClient(TargetValidator validator, SSLContext context) {
        var properties = new ProxyProperties(Duration.ofSeconds(2), 1048576, 1024, 5, 64, 16384, 100, 8192);
        return new LimitedHttpClient(properties, validator, new HeaderSanitizer(properties),
                new PinnedHttpTransport(context));
    }

    private HeldCertificate restartAsHttps(String hostname) throws Exception {
        server.shutdown();
        var certificate = new HeldCertificate.Builder().addSubjectAlternativeName(hostname).build();
        var serverCertificates = new HandshakeCertificates.Builder().heldCertificate(certificate).build();
        server = new MockWebServer();
        sniRecorder = new SniRecordingSocketFactory(serverCertificates.sslSocketFactory());
        server.useHttps(sniRecorder, false);
        server.start();
        return certificate;
    }

    private SSLContext trust(HeldCertificate certificate) throws Exception {
        var trusted = new HandshakeCertificates.Builder()
                .addTrustedCertificate(certificate.certificate()).build();
        var context = SSLContext.getInstance("TLS");
        context.init(null, new TrustManager[]{trusted.trustManager()}, new SecureRandom());
        return context;
    }

    private CountingValidator validator() {
        return new CountingValidator();
    }

    private static final class CountingValidator extends TargetValidator {
        private final AtomicInteger calls = new AtomicInteger();

        @Override
        public ValidatedTarget validate(URI uri) {
            calls.incrementAndGet();
            try {
                return new ValidatedTarget(uri, List.of(InetAddress.getByName(uri.getHost())));
            } catch (Exception exception) {
                throw new RuntimeException(exception);
            }
        }

        int calls() {
            return calls.get();
        }
    }

    private static final class SniRecordingSocketFactory extends SSLSocketFactory {
        private final SSLSocketFactory delegate;
        private final AtomicReference<String> requestedName = new AtomicReference<>();

        private SniRecordingSocketFactory(SSLSocketFactory delegate) {
            this.delegate = delegate;
        }

        private Socket observe(Socket socket) {
            if (socket instanceof SSLSocket sslSocket) {
                sslSocket.addHandshakeCompletedListener(event -> {
                    if (event.getSession() instanceof ExtendedSSLSession session) {
                        for (SNIServerName serverName : session.getRequestedServerNames()) {
                            if (serverName instanceof SNIHostName hostName) {
                                requestedName.set(hostName.getAsciiName());
                            }
                        }
                    }
                });
            }
            return socket;
        }

        private String requestedServerName() throws InterruptedException {
            for (int attempt = 0; attempt < 100 && requestedName.get() == null; attempt++) {
                Thread.sleep(10);
            }
            return requestedName.get();
        }

        @Override
        public String[] getDefaultCipherSuites() {
            return delegate.getDefaultCipherSuites();
        }

        @Override
        public String[] getSupportedCipherSuites() {
            return delegate.getSupportedCipherSuites();
        }

        @Override
        public Socket createSocket(Socket socket, String host, int port, boolean autoClose) throws java.io.IOException {
            return observe(delegate.createSocket(socket, host, port, autoClose));
        }

        @Override
        public Socket createSocket(String host, int port) throws java.io.IOException {
            return observe(delegate.createSocket(host, port));
        }

        @Override
        public Socket createSocket(String host, int port, InetAddress localHost, int localPort)
                throws java.io.IOException {
            return observe(delegate.createSocket(host, port, localHost, localPort));
        }

        @Override
        public Socket createSocket(InetAddress host, int port) throws java.io.IOException {
            return observe(delegate.createSocket(host, port));
        }

        @Override
        public Socket createSocket(InetAddress address, int port, InetAddress localAddress, int localPort)
                throws java.io.IOException {
            return observe(delegate.createSocket(address, port, localAddress, localPort));
        }
    }
}

package shrimp.proxy.client;

import shrimp.proxy.api.HttpSendRequest;
import shrimp.proxy.config.ProxyProperties;
import shrimp.proxy.security.HeaderSanitizer;
import shrimp.proxy.security.TargetValidator;
import shrimp.proxy.security.ValidatedTarget;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.InetAddress;
import java.net.URI;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LimitedHttpClientTest {
    private MockWebServer server;

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
    void failsWhenRedirectCountIsExceeded() {
        server.enqueue(new MockResponse().setResponseCode(302).addHeader("Location", "/again"));

        assertThatThrownBy(() -> client(Duration.ofSeconds(2), 1024, 0, validator()).send(
                new HttpSendRequest(server.url("/start").toString(), "GET", Map.of(), null)))
                .isInstanceOf(TooManyRedirectsException.class);
    }

    private LimitedHttpClient client(Duration timeout, long maxBytes, int redirects, CountingValidator validator) {
        return new LimitedHttpClient(
                new ProxyProperties(timeout, maxBytes, redirects), validator, new HeaderSanitizer());
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
}

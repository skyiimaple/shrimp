package shrimp.proxy.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "server.address=127.0.0.1",
        "shrimp.proxy.max-request-bytes=12",
        "shrimp.proxy.max-request-envelope-bytes=256"
})
class Base64EnvelopeLimitIntegrationTest {
    @LocalServerPort
    private int port;

    @Autowired
    private ObjectMapper objectMapper;

    private MockWebServer upstream;

    @BeforeEach
    void startUpstream() throws Exception {
        upstream = new MockWebServer();
        upstream.enqueue(new MockResponse().setBody("ok"));
        upstream.start();
    }

    @AfterEach
    void stopUpstream() throws Exception {
        upstream.shutdown();
    }

    @Test
    void acceptsBase64PayloadAtDecodedLimitDespiteLargerJsonEnvelope() throws Exception {
        var payload = new byte[]{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11};
        var response = send(jsonRequest(payload), false);

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(upstream.takeRequest().getBody().readByteArray()).containsExactly(payload);
    }

    @Test
    void rejectsBase64PayloadOverDecodedLimitBeforeUpstream() throws Exception {
        var payload = new byte[]{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12};
        var response = send(jsonRequest(payload), true);

        assertThat(response.statusCode()).isEqualTo(413);
        assertThat(response.body()).contains("REQUEST_TOO_LARGE");
        assertThat(upstream.getRequestCount()).isZero();
    }

    @Test
    void boundsOversizedJsonEnvelopeWithoutContentLength() throws Exception {
        var request = objectMapper.writeValueAsString(Map.of(
                "url", upstream.url("/oversized").toString(),
                "method", "POST",
                "body", "x".repeat(300)));
        var response = send(request, true);

        assertThat(response.statusCode()).isEqualTo(413);
        assertThat(response.body()).contains("REQUEST_TOO_LARGE");
        assertThat(upstream.getRequestCount()).isZero();
    }

    private String jsonRequest(byte[] payload) throws Exception {
        return objectMapper.writeValueAsString(Map.of(
                "url", upstream.url("/binary").toString(),
                "method", "POST",
                "bodyEncoding", "base64",
                "body", Base64.getEncoder().encodeToString(payload)));
    }

    private HttpResponse<String> send(String json, boolean chunked) throws Exception {
        var bytes = json.getBytes(StandardCharsets.UTF_8);
        var publisher = chunked
                ? HttpRequest.BodyPublishers.ofInputStream(() -> new java.io.ByteArrayInputStream(bytes))
                : HttpRequest.BodyPublishers.ofByteArray(bytes);
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/http/send"))
                .timeout(Duration.ofSeconds(5))
                .header("Content-Type", "application/json")
                .POST(publisher)
                .build();
        return HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
    }
}

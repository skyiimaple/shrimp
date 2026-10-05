package shrimp.proxy.api;

import shrimp.proxy.client.LimitedHttpClient;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "server.address=127.0.0.1",
        "shrimp.proxy.max-request-bytes=128",
        "shrimp.proxy.max-request-envelope-bytes=128"
})
class HttpRequestSizeLimitTest {
    @LocalServerPort
    private int port;

    @MockitoBean
    private LimitedHttpClient upstream;

    @Test
    void acceptsRequestAtExactByteLimit() throws Exception {
        var json = paddedJson(128);
        assertThat(json.getBytes(StandardCharsets.UTF_8)).hasSize(128);
        when(upstream.send(any())).thenReturn(new HttpSendResponse(200, Map.of(), "ok", "text", 1));

        var response = send(json, false);

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("\"body\":\"ok\"");
    }

    @Test
    void rejectsOneByteOverLimitBeforeUpstreamCall() throws Exception {
        var json = paddedJson(129);
        assertThat(json.getBytes(StandardCharsets.UTF_8)).hasSize(129);

        var response = send(json, false);

        assertTooLarge(response);
        verifyNoInteractions(upstream);
    }

    @Test
    void rejectsChunkedRequestWithoutContentLengthBeforeUpstreamCall() throws Exception {
        var response = send(paddedJson(129), true);

        assertTooLarge(response);
        verifyNoInteractions(upstream);
    }

    @Test
    void countsUtf8BytesRatherThanCharacters() throws Exception {
        var json = paddedJson(127).replaceFirst("a", "虾");
        assertThat(json.length()).isEqualTo(127);
        assertThat(json.getBytes(StandardCharsets.UTF_8)).hasSize(129);

        var response = send(json, true);

        assertTooLarge(response);
        verifyNoInteractions(upstream);
    }

    private HttpResponse<String> send(String json, boolean chunked) throws Exception {
        var bytes = json.getBytes(StandardCharsets.UTF_8);
        var publisher = chunked
                ? HttpRequest.BodyPublishers.ofInputStream(() -> new ByteArrayInputStream(bytes))
                : HttpRequest.BodyPublishers.ofByteArray(bytes);
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/http/send"))
                .timeout(Duration.ofSeconds(5))
                .header("Content-Type", "application/json")
                .POST(publisher)
                .build();
        return HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
    }

    private String paddedJson(int bytes) {
        var prefix = "{\"url\":\"https://example.com\",\"method\":\"POST\",\"body\":\"";
        var suffix = "\"}";
        return prefix + "a".repeat(bytes - prefix.length() - suffix.length()) + suffix;
    }

    private void assertTooLarge(HttpResponse<String> response) {
        assertThat(response.statusCode()).isEqualTo(413);
        assertThat(response.body()).contains("\"code\":\"REQUEST_TOO_LARGE\"")
                .contains("\"message\":\"请求体超过大小限制\"")
                .doesNotContain("stackTrace");
    }
}

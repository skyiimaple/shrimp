package shrimp.proxy.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.Map;
import java.util.zip.GZIPOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class HttpResponseContractIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

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
    void returnsEmptyBodyForHeadResponse() throws Exception {
        server.enqueue(new MockResponse().setResponseCode(200).addHeader("Content-Length", "12"));

        var response = send("HEAD", server.url("/head").toString());

        assertThat(response.get("status").asInt()).isEqualTo(200);
        assertThat(response.get("body").asText()).isEmpty();
        assertThat(response.get("bodyEncoding").asText()).isEqualTo("text");
        assertThat(server.takeRequest().getMethod()).isEqualTo("HEAD");
    }

    @Test
    void returnsEmptyBodyForNoContentAndNotModifiedResponses() throws Exception {
        server.enqueue(new MockResponse().setResponseCode(204));
        var noContent = send("GET", server.url("/empty").toString());
        server.enqueue(new MockResponse().setResponseCode(304));
        var notModified = send("GET", server.url("/not-modified").toString());

        assertThat(noContent.get("status").asInt()).isEqualTo(204);
        assertThat(noContent.get("body").asText()).isEmpty();
        assertThat(notModified.get("status").asInt()).isEqualTo(304);
        assertThat(notModified.get("body").asText()).isEmpty();
    }

    @Test
    void returnsBinaryBodyAsBase64WithoutDecodingContentEncoding() throws Exception {
        var payload = new byte[]{0, 1, 2, (byte) 0xff};
        server.enqueue(new MockResponse().setResponseCode(200)
                .addHeader("Content-Type", "application/octet-stream")
                .setBody(new okio.Buffer().write(payload)));

        var response = send("GET", server.url("/binary").toString());

        assertThat(response.get("bodyEncoding").asText()).isEqualTo("base64");
        assertThat(response.get("body").asText()).isEqualTo(Base64.getEncoder().encodeToString(payload));
    }

    @Test
    void preservesErrorStatusDuplicateHeadersAndContentEncoding() throws Exception {
        var compressed = gzip("compressed body");
        server.enqueue(new MockResponse().setResponseCode(418)
                .addHeader("X-Multi", "one")
                .addHeader("X-Multi", "two")
                .addHeader("Content-Encoding", "gzip")
                .setBody(new okio.Buffer().write(compressed)));

        var response = send("GET", server.url("/teapot").toString());

        assertThat(response.get("status").asInt()).isEqualTo(418);
        assertThat(response.get("headers").get("x-multi").isArray()).isTrue();
        assertThat(response.get("headers").get("x-multi").get(0).asText()).isEqualTo("one");
        assertThat(response.get("headers").get("x-multi").get(1).asText()).isEqualTo("two");
        assertThat(response.get("headers").get("content-encoding").get(0).asText()).isEqualTo("gzip");
        assertThat(response.get("bodyEncoding").asText()).isEqualTo("base64");
        assertThat(response.get("body").asText()).isEqualTo(Base64.getEncoder().encodeToString(compressed));
    }

    private JsonNode send(String method, String url) throws Exception {
        var request = Map.of("url", url, "method", method, "headers", Map.of());
        var result = mockMvc.perform(post("/api/http/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(request)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsByteArray());
    }

    private byte[] gzip(String value) throws Exception {
        var output = new ByteArrayOutputStream();
        try (var gzip = new GZIPOutputStream(output)) {
            gzip.write(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        }
        return output.toByteArray();
    }
}

package shrimp.proxy.api;

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
import shrimp.proxy.client.LimitedHttpClient;
import shrimp.proxy.client.PinnedHttpTransport;
import shrimp.proxy.config.ProxyProperties;
import shrimp.proxy.security.HeaderSanitizer;
import shrimp.proxy.security.TargetValidator;

import java.time.Duration;
import java.util.Base64;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class BinaryRequestBodyIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

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
    void defaultsToTextBodyEncodingForExistingRequests() throws Exception {
        server.enqueue(new MockResponse().setBody("ok"));

        mockMvc.perform(send("{\"url\":\"" + server.url("/text")
                        + "\",\"method\":\"POST\",\"body\":\"虾\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200));

        assertThat(server.takeRequest().getBody().readUtf8()).isEqualTo("虾");
    }

    @Test
    void decodesBase64AndForwardsExactBinaryBytes() throws Exception {
        var payload = new byte[]{0, 1, 2, (byte) 0xff};
        server.enqueue(new MockResponse().setBody("ok"));

        mockMvc.perform(send("{\"url\":\"" + server.url("/binary")
                        + "\",\"method\":\"POST\",\"bodyEncoding\":\"base64\",\"body\":\""
                        + Base64.getEncoder().encodeToString(payload) + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200));

        var request = server.takeRequest();
        assertThat(request.getBody().readByteArray()).containsExactly(payload);
        assertThat(request.getHeader("Content-Length")).isEqualTo("4");
    }

    @Test
    void rejectsInvalidBase64BeforeContactingUpstream() throws Exception {
        mockMvc.perform(send("{\"url\":\"" + server.url("/invalid")
                        + "\",\"method\":\"POST\",\"bodyEncoding\":\"base64\",\"body\":\"not-base64!\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));

        assertThat(server.getRequestCount()).isZero();
    }

    @Test
    void rejectsUnknownBodyEncodingBeforeContactingUpstream() throws Exception {
        mockMvc.perform(send("{\"url\":\"" + server.url("/unknown")
                        + "\",\"method\":\"POST\",\"bodyEncoding\":\"hex\",\"body\":\"00\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));

        assertThat(server.getRequestCount()).isZero();
    }

    @Test
    void appliesRequestBodyLimitToDecodedBytes() throws Exception {
        var payload = Base64.getEncoder().encodeToString(new byte[]{1, 2, 3, 4, 5});
        var properties = new ProxyProperties(Duration.ofSeconds(2), 4, 1024, 0,
                64, 16384, 100, 8192);
        var client = new LimitedHttpClient(properties, new TargetValidator(),
                new HeaderSanitizer(properties), new PinnedHttpTransport());

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> client.send(new HttpSendRequest(
                        server.url("/too-large").toString(), "POST", Map.of(), payload, "base64")))
                .isInstanceOf(RequestBodyTooLargeException.class);

        assertThat(server.getRequestCount()).isZero();
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder send(String body) {
        return post("/api/http/send").contentType(MediaType.APPLICATION_JSON).content(body);
    }
}

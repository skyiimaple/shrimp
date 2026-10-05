package shrimp.proxy.api;

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

import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class RequestHeaderLimitsIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private MockWebServer upstream;

    @BeforeEach
    void startUpstream() throws Exception {
        upstream = new MockWebServer();
        upstream.start();
        upstream.enqueue(new MockResponse().setBody("upstream reached"));
    }

    @AfterEach
    void stopUpstream() throws Exception {
        upstream.shutdown();
    }

    @Test
    void forwardsExactly64CustomHeaders() throws Exception {
        var headers = new LinkedHashMap<String, String>();
        for (int index = 0; index < 64; index++) {
            headers.put("X-Header-" + index, "v");
        }

        send(headers)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.body").value("upstream reached"));
        assertThat(upstream.getRequestCount()).isEqualTo(1);
    }

    @Test
    void rejectsMoreThan64CustomHeadersWithoutUpstreamRequest() throws Exception {
        var headers = new LinkedHashMap<String, String>();
        for (int index = 0; index < 65; index++) {
            headers.put("X-Header-" + index, "v");
        }

        send(headers)
                .andExpect(status().is(431))
                .andExpect(jsonPath("$.code").value("REQUEST_HEADERS_TOO_LARGE"))
                .andExpect(jsonPath("$.message").value("自定义请求头超过大小限制"));
        assertThat(upstream.getRequestCount()).isZero();
    }

    @Test
    void rejectsMoreThan16KiBUtf8HeaderBytesWithoutUpstreamRequest() throws Exception {
        send(Map.of("X-Note", "中".repeat(5460)))
                .andExpect(status().is(431))
                .andExpect(jsonPath("$.code").value("REQUEST_HEADERS_TOO_LARGE"));
        assertThat(upstream.getRequestCount()).isZero();
    }

    @Test
    void rejectsCaseInsensitiveDuplicateNamesWithoutUpstreamRequest() throws Exception {
        send(Map.of("X-Token", "one", "x-token", "two"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        assertThat(upstream.getRequestCount()).isZero();
    }

    @Test
    void rejectsExactDuplicateJsonNamesWithoutUpstreamRequest() throws Exception {
        mockMvc.perform(post("/api/http/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"url\":\"" + upstream.url("/") + "\",\"method\":\"GET\","
                                + "\"headers\":{\"X-Token\":\"one\",\"X-Token\":\"two\"}}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        assertThat(upstream.getRequestCount()).isZero();
    }

    private org.springframework.test.web.servlet.ResultActions send(Map<String, String> headers) throws Exception {
        var payload = objectMapper.writeValueAsBytes(Map.of(
                "url", upstream.url("/").toString(), "method", "GET", "headers", headers));
        return mockMvc.perform(post("/api/http/send")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload));
    }
}

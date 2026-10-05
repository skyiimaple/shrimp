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

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ProxyResponseHeaderLimitsIntegrationTest {
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
    void rejectsExcessiveUpstreamHeaderCountWithoutReturningPartialResponse() throws Exception {
        var response = new MockResponse().setBody("secret");
        for (int index = 0; index < 101; index++) {
            response.addHeader("X-Extra-" + index, "value");
        }
        server.enqueue(response);

        mockMvc.perform(send(server.url("/many").toString()))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("UPSTREAM_RESPONSE_HEADERS_TOO_LARGE"))
                .andExpect(jsonPath("$.message").value("上游响应头超过大小限制"))
                .andExpect(jsonPath("$.body").doesNotExist())
                .andExpect(jsonPath("$.headers").doesNotExist());
    }

    @Test
    void acceptsOrdinaryResponseWithinHeaderLimits() throws Exception {
        server.enqueue(new MockResponse().addHeader("X-Upstream", "ok").setBody("ready"));

        mockMvc.perform(send(server.url("/normal").toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.body").value("ready"))
                .andExpect(jsonPath("$.headers.x-upstream[0]").value("ok"));
    }

    @Test
    void acceptsExactlyOneHundredUpstreamHeaders() throws Exception {
        var response = new MockResponse().setBody("boundary");
        for (int index = 0; index < 99; index++) {
            response.addHeader("X-Extra-" + index, "value");
        }
        assertThat(response.getHeaders().size()).isEqualTo(100);
        server.enqueue(response);

        mockMvc.perform(send(server.url("/boundary").toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.body").value("boundary"));
    }

    @Test
    void rejectsOneHundredAndOneUpstreamHeaders() throws Exception {
        var response = new MockResponse().setBody("secret");
        for (int index = 0; index < 100; index++) {
            response.addHeader("X-Extra-" + index, "value");
        }
        assertThat(response.getHeaders().size()).isEqualTo(101);
        server.enqueue(response);

        mockMvc.perform(send(server.url("/over-boundary").toString()))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("UPSTREAM_RESPONSE_HEADERS_TOO_LARGE"));
    }

    @Test
    void rejectsOversizedUpstreamHeaderLine() throws Exception {
        server.enqueue(new MockResponse().addHeader("X-L", "a".repeat(8188)).setBody("secret"));

        mockMvc.perform(send(server.url("/long").toString()))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("UPSTREAM_RESPONSE_HEADERS_TOO_LARGE"));
    }

    @Test
    void acceptsUpstreamHeaderLineAtLimit() throws Exception {
        server.enqueue(new MockResponse().addHeader("X-L", "a".repeat(8187)).setBody("boundary"));

        mockMvc.perform(send(server.url("/line-boundary").toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.body").value("boundary"));
    }

    @Test
    void rejectsExcessiveHeadersOnRedirectBeforeFollowingIt() throws Exception {
        var response = new MockResponse().setResponseCode(302).addHeader("Location", "/next");
        for (int index = 0; index < 101; index++) {
            response.addHeader("X-Extra-" + index, "value");
        }
        server.enqueue(response);
        server.enqueue(new MockResponse().setBody("should not be fetched"));

        mockMvc.perform(send(server.url("/start").toString()))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("UPSTREAM_RESPONSE_HEADERS_TOO_LARGE"));
        assertThat(server.getRequestCount()).isEqualTo(1);
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder send(String url) {
        return post("/api/http/send")
                .contentType(MediaType.APPLICATION_JSON)
                .content(new com.fasterxml.jackson.databind.ObjectMapper().valueToTree(
                        Map.of("url", url, "method", "GET")).toString());
    }
}

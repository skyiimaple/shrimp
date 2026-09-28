package shrimp.proxy.api;

import shrimp.proxy.client.LimitedHttpClient;
import shrimp.proxy.client.ResponseTooLargeException;
import shrimp.proxy.client.UpstreamConnectionException;
import shrimp.proxy.client.UpstreamTimeoutException;
import shrimp.proxy.security.BlockedTargetException;
import shrimp.proxy.security.DnsResolutionException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class HttpProxyControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private LimitedHttpClient client;

    @Test
    void returnsStableSuccessContract() throws Exception {
        when(client.send(any())).thenReturn(new HttpSendResponse(
                200, Map.of("content-type", List.of("application/json")),
                "{\"ok\":true}", "text", 12));

        mockMvc.perform(post("/api/http/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"url":"https://example.com","method":"GET","headers":{}}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.bodyEncoding").value("text"))
                .andExpect(jsonPath("$.durationMs").value(12));
    }

    @Test
    void rejectsInvalidMethodWithChineseError() throws Exception {
        mockMvc.perform(post("/api/http/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"url":"https://example.com","method":"TRACE"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.message").value("请求参数无效"))
                .andExpect(jsonPath("$.stackTrace").doesNotExist());
    }

    @Test
    void mapsProxyFailuresToStableChineseErrors() throws Exception {
        assertMapped(new BlockedTargetException(), 403, "TARGET_BLOCKED", "目标地址不允许访问");
        assertMapped(new DnsResolutionException(), 502, "DNS_RESOLUTION_FAILED", "目标主机解析失败");
        assertMapped(new UpstreamTimeoutException(), 504, "UPSTREAM_TIMEOUT", "上游请求超时");
        assertMapped(new UpstreamConnectionException(new java.io.IOException()), 502,
                "UPSTREAM_CONNECTION_FAILED", "无法连接上游服务");
        assertMapped(new ResponseTooLargeException(), 502, "RESPONSE_TOO_LARGE", "上游响应体超过大小限制");
    }

    private void assertMapped(RuntimeException failure, int expectedStatus, String code, String message)
            throws Exception {
        reset(client);
        when(client.send(any())).thenThrow(failure);
        mockMvc.perform(post("/api/http/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"url":"https://example.com","method":"GET"}
                                """))
                .andExpect(status().is(expectedStatus))
                .andExpect(jsonPath("$.code").value(code))
                .andExpect(jsonPath("$.message").value(message))
                .andExpect(jsonPath("$.stackTrace").doesNotExist());
    }
}

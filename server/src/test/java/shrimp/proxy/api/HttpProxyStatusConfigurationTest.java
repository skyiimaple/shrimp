package shrimp.proxy.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "shrimp.proxy.timeout=2500ms",
        "shrimp.proxy.max-request-bytes=128",
        "shrimp.proxy.max-request-headers=3",
        "shrimp.proxy.max-request-header-bytes=100",
        "shrimp.proxy.max-response-bytes=4096",
        "shrimp.proxy.max-response-headers=17",
        "shrimp.proxy.max-response-header-line-length=1234",
        "shrimp.proxy.max-request-envelope-bytes=5000",
        "shrimp.proxy.max-redirects=2"
})
@AutoConfigureMockMvc
class HttpProxyStatusConfigurationTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void reportsEffectiveConfigurationOverrides() throws Exception {
        mockMvc.perform(get("/api/http/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.timeoutMs").value(2500))
                .andExpect(jsonPath("$.maxRequestBytes").value(128))
                .andExpect(jsonPath("$.maxRequestHeaders").value(3))
                .andExpect(jsonPath("$.maxRequestHeaderBytes").value(100))
                .andExpect(jsonPath("$.maxResponseBytes").value(4096))
                .andExpect(jsonPath("$.maxResponseHeaders").value(17))
                .andExpect(jsonPath("$.maxResponseHeaderLineLength").value(1234))
                .andExpect(jsonPath("$.maxRequestEnvelopeBytes").value(5000))
                .andExpect(jsonPath("$.maxRedirects").value(2));
    }
}

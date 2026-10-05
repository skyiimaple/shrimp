package shrimp.proxy.api;

import shrimp.proxy.client.LimitedHttpClient;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CrossSiteRequestProtectionTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private LimitedHttpClient client;

    @Test
    void rejectsCrossSiteJsonPostBeforeProxyInvocation() throws Exception {
        mockMvc.perform(post("/api/http/send")
                        .header("Origin", "https://evil.example")
                        .header("Sec-Fetch-Site", "cross-site")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"url\":\"http://127.0.0.1:8080\",\"method\":\"GET\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CROSS_SITE_REQUEST_BLOCKED"))
                .andExpect(jsonPath("$.message").value("跨站请求不允许访问本地代理"));

        verifyNoInteractions(client);
    }

    @Test
    void rejectsCrossSitePreflightBeforeDispatcher() throws Exception {
        mockMvc.perform(options("/api/http/send")
                        .header("Origin", "https://evil.example")
                        .header("Sec-Fetch-Site", "cross-site")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CROSS_SITE_REQUEST_BLOCKED"));

        verifyNoInteractions(client);
    }

    @Test
    void rejectsSimpleFormPostFromCrossSiteOriginBeforeBodyParsing() throws Exception {
        mockMvc.perform(post("/api/http/send")
                        .header("Origin", "https://evil.example")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .content("url=http%3A%2F%2F127.0.0.1%3A8080&method=GET"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CROSS_SITE_REQUEST_BLOCKED"));

        verifyNoInteractions(client);
    }

    @Test
    void rejectsFetchMetadataCrossSiteEvenWhenOriginIsAbsent() throws Exception {
        mockMvc.perform(post("/api/http/send")
                        .header("Sec-Fetch-Site", "cross-site")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"url\":\"http://127.0.0.1:8080\",\"method\":\"GET\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CROSS_SITE_REQUEST_BLOCKED"));

        verifyNoInteractions(client);
    }

    @Test
    void rejectsOpaqueOrMalformedOrigin() throws Exception {
        for (String origin : new String[]{"null", "not-an-origin"}) {
            mockMvc.perform(post("/api/http/send")
                            .header("Origin", origin)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"url\":\"http://127.0.0.1:8080\",\"method\":\"GET\"}"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("CROSS_SITE_REQUEST_BLOCKED"));
        }

        verifyNoInteractions(client);
    }

    @Test
    void allowsCliRequestsWithoutBrowserHeaders() throws Exception {
        mockMvc.perform(post("/api/http/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"url\":\"http://127.0.0.1:8080\",\"method\":\"GET\"}"))
                .andExpect(status().isOk());

        verify(client).send(any());
    }

    @Test
    void allowsLocalDevelopmentOrigin() throws Exception {
        mockMvc.perform(post("/api/http/send")
                        .header("Origin", "http://localhost:5173")
                        .header("Sec-Fetch-Site", "same-site")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"url\":\"http://127.0.0.1:8080\",\"method\":\"GET\"}"))
                .andExpect(status().isOk());

        verify(client).send(any());
    }

    @Test
    void allowsIpv6LoopbackDevelopmentOrigin() throws Exception {
        mockMvc.perform(post("/api/http/send")
                        .header("Origin", "http://[::1]:5173")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"url\":\"http://127.0.0.1:8080\",\"method\":\"GET\"}"))
                .andExpect(status().isOk());

        verify(client).send(any());
    }

    @Test
    void rejectsDuplicateOriginHeadersEvenWhenFirstValueIsLocal() throws Exception {
        mockMvc.perform(post("/api/http/send")
                        .header("Origin", "http://localhost:5173", "https://evil.example")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"url\":\"http://127.0.0.1:8080\",\"method\":\"GET\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CROSS_SITE_REQUEST_BLOCKED"));

        verifyNoInteractions(client);
    }

    @Test
    void rejectsOriginUserinfoPathQueryAndCommaJoinedValues() throws Exception {
        for (String origin : new String[]{
                "http://evil@localhost:5173",
                "http://localhost:5173/path",
                "http://localhost:5173/?next=evil",
                "http://localhost:5173,https://evil.example"}) {
            mockMvc.perform(post("/api/http/send")
                            .header("Origin", origin)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"url\":\"http://127.0.0.1:8080\",\"method\":\"GET\"}"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("CROSS_SITE_REQUEST_BLOCKED"));
        }

        verifyNoInteractions(client);
    }
}

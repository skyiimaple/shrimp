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
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class JsonReadConstraintsIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private LimitedHttpClient client;

    @Test
    void acceptsShallowRequestAndInvokesUpstream() throws Exception {
        when(client.send(any())).thenReturn(new HttpSendResponse(200, java.util.Map.of(), "ok", "text", 1));

        mockMvc.perform(post("/api/http/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"url\":\"http://127.0.0.1:8080\",\"method\":\"GET\",\"headers\":{}}"))
                .andExpect(status().isOk());

        verify(client).send(any());
    }

    @Test
    void rejectsExcessiveJsonNestingWithoutInvokingUpstream() throws Exception {
        var nested = "x";
        for (int index = 0; index < 110; index++) {
            nested = "[" + nested + "]";
        }
        var json = "{\"url\":\"http://127.0.0.1:8080\",\"method\":\"GET\",\"headers\":"
                + nested + "}";

        mockMvc.perform(post("/api/http/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.stackTrace").doesNotExist());

        verifyNoInteractions(client);
    }

    @Test
    void rejectsExcessiveStringLengthWithoutInvokingUpstream() throws Exception {
        var json = "{\"url\":\"http://127.0.0.1:8080\",\"method\":\"GET\",\"body\":\""
                + "a".repeat(1_048_577) + "\"}";

        mockMvc.perform(post("/api/http/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));

        verifyNoInteractions(client);
    }

    @Test
    void acceptsStringAtConfiguredParserLimit() throws Exception {
        when(client.send(any())).thenReturn(new HttpSendResponse(200, java.util.Map.of(), "ok", "text", 1));
        var json = "{\"url\":\"http://127.0.0.1:8080\",\"method\":\"GET\",\"body\":\""
                + "a".repeat(1_048_576) + "\"}";

        mockMvc.perform(post("/api/http/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk());

        verify(client).send(any());
    }

    @Test
    void rejectsExcessiveNumberLengthWithoutInvokingUpstream() throws Exception {
        var json = "{\"url\":\"http://127.0.0.1:8080\",\"method\":\"GET\",\"extra\":"
                + "9".repeat(1001) + "}";

        mockMvc.perform(post("/api/http/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));

        verifyNoInteractions(client);
    }
}

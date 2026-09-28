package shrimp.proxy.security;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class HeaderSanitizerTest {
    @Test
    void allowsApplicationHeadersIncludingAuthorization() {
        var headers = new HeaderSanitizer().sanitize(Map.of(
                "Content-Type", "application/json",
                "Authorization", "Bearer secret",
                "X-Request-Id", "abc"));

        assertThat(headers.getFirst("Content-Type")).isEqualTo("application/json");
        assertThat(headers.getFirst("Authorization")).isEqualTo("Bearer secret");
        assertThat(headers.getFirst("X-Request-Id")).isEqualTo("abc");
    }

    @Test
    void rejectsHopByHopAndSensitiveTransportHeadersCaseInsensitively() {
        for (String name : new String[]{"Host", "content-length", "CONNECTION", "Transfer-Encoding",
                "Upgrade", "Proxy-Authorization", "Proxy-Authenticate", "TE", "Trailer", "Keep-Alive"}) {
            assertThatThrownBy(() -> new HeaderSanitizer().sanitize(Map.of(name, "value")))
                    .as(name)
                    .isInstanceOf(InvalidHeaderException.class);
        }
    }

    @Test
    void rejectsHeaderInjectionAndNullValues() {
        var nullValue = new LinkedHashMap<String, String>();
        nullValue.put("X-Test", null);

        assertThatThrownBy(() -> new HeaderSanitizer().sanitize(Map.of("X-Test", "ok\r\nInjected: yes")))
                .isInstanceOf(InvalidHeaderException.class);
        assertThatThrownBy(() -> new HeaderSanitizer().sanitize(nullValue))
                .isInstanceOf(InvalidHeaderException.class);
        assertThatThrownBy(() -> new HeaderSanitizer().sanitize(Map.of("Bad Header", "value")))
                .isInstanceOf(InvalidHeaderException.class);
    }
}

package shrimp.proxy.security;

import org.junit.jupiter.api.Test;
import shrimp.proxy.config.ProxyProperties;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class HeaderSanitizerTest {
    @Test
    void allowsApplicationHeadersIncludingAuthorization() {
        var headers = sanitizer(64, 16384).sanitize(Map.of(
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
            assertThatThrownBy(() -> sanitizer(64, 16384).sanitize(Map.of(name, "value")))
                    .as(name)
                    .isInstanceOf(InvalidHeaderException.class);
        }
    }

    @Test
    void rejectsHeaderInjectionAndNullValues() {
        var nullValue = new LinkedHashMap<String, String>();
        nullValue.put("X-Test", null);

        assertThatThrownBy(() -> sanitizer(64, 16384).sanitize(Map.of("X-Test", "ok\r\nInjected: yes")))
                .isInstanceOf(InvalidHeaderException.class);
        assertThatThrownBy(() -> sanitizer(64, 16384).sanitize(nullValue))
                .isInstanceOf(InvalidHeaderException.class);
        assertThatThrownBy(() -> sanitizer(64, 16384).sanitize(Map.of("Bad Header", "value")))
                .isInstanceOf(InvalidHeaderException.class);
    }

    @Test
    void acceptsExactlyMaximumEntriesAndRejectsOneMore() {
        var two = Map.of("X-One", "1", "X-Two", "2");
        assertThat(sanitizer(2, 16384).sanitize(two).size()).isEqualTo(2);

        assertThatThrownBy(() -> sanitizer(1, 16384).sanitize(two))
                .isInstanceOf(RequestHeadersTooLargeException.class);
    }

    @Test
    void countsNameAndValueUtf8BytesAtExactBoundary() {
        assertThat(sanitizer(64, 4).sanitize(Map.of("X", "中")).getFirst("X")).isEqualTo("中");
        assertThatThrownBy(() -> sanitizer(64, 4).sanitize(Map.of("X", "中a")))
                .isInstanceOf(RequestHeadersTooLargeException.class);
    }

    @Test
    void emptyValueStillCountsHeaderNameBytes() {
        assertThat(sanitizer(64, 7).sanitize(Map.of("X-Empty", "")).getFirst("X-Empty"))
                .isEmpty();
        assertThatThrownBy(() -> sanitizer(64, 6).sanitize(Map.of("X-Empty", "")))
                .isInstanceOf(RequestHeadersTooLargeException.class);
    }

    @Test
    void rejectsCaseInsensitiveDuplicateNames() {
        assertThatThrownBy(() -> sanitizer(64, 16384).sanitize(Map.of("X-Token", "one", "x-token", "two")))
                .isInstanceOf(InvalidHeaderException.class);
    }

    @Test
    void rejectsInvalidLimitConfiguration() {
        assertThatThrownBy(() -> properties(0, 16384)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> properties(64, 0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> properties(-1, 16384)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> properties(64, -1)).isInstanceOf(IllegalArgumentException.class);
    }

    private HeaderSanitizer sanitizer(int maxHeaders, long maxBytes) {
        return new HeaderSanitizer(properties(maxHeaders, maxBytes));
    }

    private ProxyProperties properties(int maxHeaders, long maxBytes) {
        return new ProxyProperties(Duration.ofSeconds(1), 1048576, 2097152, 5, maxHeaders, maxBytes, 100, 8192);
    }
}

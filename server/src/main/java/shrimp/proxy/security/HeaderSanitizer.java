package shrimp.proxy.security;

import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import shrimp.proxy.config.ProxyProperties;

import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Component
public class HeaderSanitizer {
    private static final Set<String> FORBIDDEN = Set.of(
            "host", "content-length", "connection", "transfer-encoding", "upgrade",
            "proxy-authorization", "proxy-authenticate", "te", "trailer", "keep-alive"
    );
    private static final Pattern HEADER_NAME = Pattern.compile("[!#$%&'*+.^_`|~0-9A-Za-z-]+");
    private final ProxyProperties properties;

    public HeaderSanitizer(ProxyProperties properties) {
        this.properties = properties;
    }

    public HttpHeaders sanitize(Map<String, String> input) {
        var result = new HttpHeaders();
        if (input == null) {
            return result;
        }
        if (input.size() > properties.maxRequestHeaders()) {
            throw new RequestHeadersTooLargeException();
        }
        var seenNames = new HashSet<String>();
        long totalBytes = 0;
        for (var entry : input.entrySet()) {
            var name = entry.getKey();
            var value = entry.getValue();
            if (name == null || !HEADER_NAME.matcher(name).matches()
                    || FORBIDDEN.contains(name.toLowerCase(Locale.ROOT))) {
                throw new InvalidHeaderException("请求头不允许传递: " + name);
            }
            if (value == null || containsControlCharacter(name) || containsControlCharacter(value)) {
                throw new InvalidHeaderException("请求头格式无效: " + name);
            }
            if (!seenNames.add(name.toLowerCase(Locale.ROOT))) {
                throw new InvalidHeaderException("请求头名称重复: " + name);
            }
            totalBytes += name.getBytes(StandardCharsets.UTF_8).length
                    + value.getBytes(StandardCharsets.UTF_8).length;
            if (totalBytes > properties.maxRequestHeaderBytes()) {
                throw new RequestHeadersTooLargeException();
            }
            try {
                result.add(name, value);
            } catch (IllegalArgumentException exception) {
                throw new InvalidHeaderException("请求头格式无效: " + name);
            }
        }
        return result;
    }

    private static boolean containsControlCharacter(String value) {
        return value.chars().anyMatch(character -> character == '\r' || character == '\n' || character == 0);
    }
}

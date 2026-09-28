package shrimp.proxy.security;

import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;

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

    public HttpHeaders sanitize(Map<String, String> input) {
        var result = new HttpHeaders();
        if (input == null) {
            return result;
        }
        input.forEach((name, value) -> {
            if (name == null || !HEADER_NAME.matcher(name).matches()
                    || FORBIDDEN.contains(name.toLowerCase(Locale.ROOT))) {
                throw new InvalidHeaderException("请求头不允许传递: " + name);
            }
            if (value == null || containsControlCharacter(name) || containsControlCharacter(value)) {
                throw new InvalidHeaderException("请求头格式无效: " + name);
            }
            try {
                result.add(name, value);
            } catch (IllegalArgumentException exception) {
                throw new InvalidHeaderException("请求头格式无效: " + name);
            }
        });
        return result;
    }

    private static boolean containsControlCharacter(String value) {
        return value.chars().anyMatch(character -> character == '\r' || character == '\n' || character == 0);
    }
}

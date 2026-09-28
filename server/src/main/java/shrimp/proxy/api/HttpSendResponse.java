package shrimp.proxy.api;

import java.util.List;
import java.util.Map;

public record HttpSendResponse(
        int status,
        Map<String, List<String>> headers,
        String body,
        String bodyEncoding,
        long durationMs) {
}

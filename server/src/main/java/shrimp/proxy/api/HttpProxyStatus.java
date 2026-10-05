package shrimp.proxy.api;

import java.util.List;

public record HttpProxyStatus(
        boolean available,
        List<String> allowedMethods,
        long timeoutMs,
        long maxRequestBytes,
        int maxRequestHeaders,
        long maxRequestHeaderBytes,
        long maxResponseBytes,
        int maxResponseHeaders,
        int maxResponseHeaderLineLength,
        int maxRedirects,
        long maxRequestEnvelopeBytes) {
}

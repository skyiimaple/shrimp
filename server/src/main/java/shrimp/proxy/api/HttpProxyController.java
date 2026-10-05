package shrimp.proxy.api;

import shrimp.proxy.client.LimitedHttpClient;
import shrimp.proxy.config.ProxyProperties;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/http")
public class HttpProxyController {
    private final LimitedHttpClient client;
    private final ProxyProperties properties;

    public HttpProxyController(LimitedHttpClient client, ProxyProperties properties) {
        this.client = client;
        this.properties = properties;
    }

    @GetMapping("/status")
    public HttpProxyStatus status() {
        return new HttpProxyStatus(true, HttpSendRequest.ALLOWED_METHODS,
                properties.timeout().toMillis(), properties.maxRequestBytes(),
                properties.maxRequestHeaders(), properties.maxRequestHeaderBytes(),
                properties.maxResponseBytes(), properties.maxResponseHeaders(),
                properties.maxResponseHeaderLineLength(), properties.maxRedirects(),
                properties.maxRequestEnvelopeBytes());
    }

    @PostMapping("/send")
    public HttpSendResponse send(@Valid @RequestBody HttpSendRequest request) {
        return client.send(request);
    }
}

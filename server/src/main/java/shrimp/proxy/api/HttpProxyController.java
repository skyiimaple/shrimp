package shrimp.proxy.api;

import shrimp.proxy.client.LimitedHttpClient;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/http")
public class HttpProxyController {
    private final LimitedHttpClient client;

    public HttpProxyController(LimitedHttpClient client) {
        this.client = client;
    }

    @PostMapping("/send")
    public HttpSendResponse send(@Valid @RequestBody HttpSendRequest request) {
        return client.send(request);
    }
}

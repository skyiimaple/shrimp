package shrimp.proxy.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.Map;
import java.util.Locale;

public record HttpSendRequest(
        @NotBlank String url,
        @NotBlank
        @Pattern(regexp = "GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS") String method,
        Map<@NotBlank String, @NotNull String> headers,
        String body) {
    public HttpSendRequest {
        method = method == null ? null : method.toUpperCase(Locale.ROOT);
        headers = headers == null ? Map.of() : Map.copyOf(headers);
    }
}

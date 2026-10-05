package shrimp.proxy.api;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.Base64;

public record HttpSendRequest(
        @NotBlank String url,
        @NotBlank String method,
        Map<@NotBlank String, @NotNull String> headers,
        String body,
        String bodyEncoding) {
    public HttpSendRequest(String url, String method,
                           Map<@NotBlank String, @NotNull String> headers, String body) {
        this(url, method, headers, body, "text");
    }

    public static final List<String> ALLOWED_METHODS =
            List.of("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS");

    public HttpSendRequest {
        method = method == null ? null : method.toUpperCase(Locale.ROOT);
        headers = headers == null ? Map.of() : Map.copyOf(headers);
        bodyEncoding = bodyEncoding == null ? "text" : bodyEncoding;
    }

    @AssertTrue
    @JsonIgnore
    public boolean isAllowedMethod() {
        return ALLOWED_METHODS.contains(method);
    }

    @AssertTrue
    @JsonIgnore
    public boolean isValidBodyEncoding() {
        if (!bodyEncoding.equals("text") && !bodyEncoding.equals("base64")) {
            return false;
        }
        if (body == null || bodyEncoding.equals("text")) {
            return true;
        }
        try {
            Base64.getDecoder().decode(body);
            return true;
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    public byte[] decodedBody() {
        if (body == null) {
            return null;
        }
        return bodyEncoding.equals("base64")
                ? Base64.getDecoder().decode(body)
                : body.getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }
}

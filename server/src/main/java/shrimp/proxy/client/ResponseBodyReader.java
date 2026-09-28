package shrimp.proxy.client;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

public class ResponseBodyReader {
    private static final Pattern CHARSET = Pattern.compile("(?i)(?:^|;)\\s*charset=\\s*['\"]?([^;\s'\"]+)");

    public EncodedBody read(InputStream input, long limit, Optional<String> contentType) throws IOException {
        var output = new ByteArrayOutputStream((int) Math.min(limit, 8192));
        var buffer = new byte[8192];
        long total = 0;
        int count;
        while ((count = input.read(buffer)) != -1) {
            total += count;
            if (total > limit) {
                throw new ResponseTooLargeException();
            }
            output.write(buffer, 0, count);
        }
        var bytes = output.toByteArray();
        var charset = charsetFrom(contentType).orElse(StandardCharsets.UTF_8);
        try {
            var decoder = charset.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT);
            return new EncodedBody(decoder.decode(ByteBuffer.wrap(bytes)).toString(), "text");
        } catch (CharacterCodingException exception) {
            return new EncodedBody(Base64.getEncoder().encodeToString(bytes), "base64");
        }
    }

    private Optional<Charset> charsetFrom(Optional<String> contentType) {
        if (contentType.isEmpty()) {
            return Optional.empty();
        }
        var matcher = CHARSET.matcher(contentType.get().toLowerCase(Locale.ROOT));
        if (!matcher.find()) {
            return Optional.empty();
        }
        try {
            return Optional.of(Charset.forName(matcher.group(1)));
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    public record EncodedBody(String body, String encoding) {
    }
}

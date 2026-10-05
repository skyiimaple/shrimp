package shrimp.proxy.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import shrimp.proxy.config.ProxyProperties;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;

@Component
public class RequestBodyLimitFilter extends OncePerRequestFilter {
    private final ProxyProperties properties;
    private final ObjectMapper objectMapper;

    public RequestBodyLimitFilter(ProxyProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equals(request.getMethod())
                || !(request.getContextPath() + "/api/http/send").equals(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var limit = properties.maxRequestEnvelopeBytes();
        var body = new ByteArrayOutputStream((int) Math.min(limit, 8192));
        var input = request.getInputStream();
        var buffer = new byte[8192];
        long total = 0;

        while (true) {
            int capacity = (int) Math.min(buffer.length, limit - total + 1);
            int count = input.read(buffer, 0, capacity);
            if (count < 0) {
                break;
            }
            if (count == 0) {
                int next = input.read();
                if (next < 0) {
                    break;
                }
                buffer[0] = (byte) next;
                count = 1;
            }
            total += count;
            if (total > limit) {
                response.setStatus(HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE);
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.setCharacterEncoding(StandardCharsets.UTF_8.name());
                objectMapper.writeValue(response.getOutputStream(),
                        new ApiError("REQUEST_TOO_LARGE", "请求体超过大小限制"));
                return;
            }
            body.write(buffer, 0, count);
        }

        chain.doFilter(new BufferedRequest(request, body.toByteArray()), response);
    }

    private static final class BufferedRequest extends HttpServletRequestWrapper {
        private final byte[] body;

        private BufferedRequest(HttpServletRequest request, byte[] body) {
            super(request);
            this.body = body;
        }

        @Override
        public ServletInputStream getInputStream() {
            var input = new ByteArrayInputStream(body);
            return new ServletInputStream() {
                @Override
                public int read() {
                    return input.read();
                }

                @Override
                public boolean isFinished() {
                    return input.available() == 0;
                }

                @Override
                public boolean isReady() {
                    return true;
                }

                @Override
                public void setReadListener(ReadListener listener) {
                    throw new UnsupportedOperationException("Async request body reads are not supported");
                }
            };
        }

        @Override
        public BufferedReader getReader() {
            var encoding = getCharacterEncoding();
            var charset = encoding == null ? StandardCharsets.UTF_8 : Charset.forName(encoding);
            return new BufferedReader(new InputStreamReader(getInputStream(), charset));
        }

        @Override
        public int getContentLength() {
            return body.length;
        }

        @Override
        public long getContentLengthLong() {
            return body.length;
        }
    }
}

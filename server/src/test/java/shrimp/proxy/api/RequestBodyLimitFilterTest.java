package shrimp.proxy.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import shrimp.proxy.config.ProxyProperties;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class RequestBodyLimitFilterTest {
    @Test
    void stopsReadingUnboundedStreamAtLimitPlusOneByte() throws Exception {
        var reads = new AtomicInteger();
        var request = new MockHttpServletRequest("POST", "/api/http/send") {
            @Override
            public ServletInputStream getInputStream() {
                return new ServletInputStream() {
                    @Override
                    public int read() {
                        reads.incrementAndGet();
                        return 'a';
                    }

                    @Override
                    public boolean isFinished() {
                        return false;
                    }

                    @Override
                    public boolean isReady() {
                        return true;
                    }

                    @Override
                    public void setReadListener(ReadListener listener) {
                        throw new UnsupportedOperationException();
                    }
                };
            }

            @Override
            public long getContentLengthLong() {
                return -1;
            }
        };
        var response = new MockHttpServletResponse();
        var chain = mock(FilterChain.class);
        var filter = new RequestBodyLimitFilter(
                new ProxyProperties(Duration.ofSeconds(1), 4, 1024, 0, 64, 16384, 100, 8192, 4), new ObjectMapper());

        filter.doFilter(request, response, chain);

        assertThat(reads.get()).isEqualTo(5);
        assertThat(response.getStatus()).isEqualTo(413);
        verifyNoInteractions(chain);
    }
}

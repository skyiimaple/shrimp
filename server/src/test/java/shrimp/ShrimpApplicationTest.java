package shrimp;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class ShrimpApplicationTest {
    @Value("${server.address}")
    private String address;

    @Value("${shrimp.proxy.timeout}")
    private String timeout;

    @Value("${shrimp.proxy.max-response-bytes}")
    private long maxResponseBytes;

    @Test
    void bindsToLoopbackWithSafeDefaults() {
        assertThat(address).isEqualTo("127.0.0.1");
        assertThat(timeout).isEqualTo("10s");
        assertThat(maxResponseBytes).isEqualTo(2L * 1024 * 1024);
    }
}

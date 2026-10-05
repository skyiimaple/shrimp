package shrimp.proxy.security;

import org.junit.jupiter.api.Test;

import java.net.InetAddress;
import java.net.Inet6Address;
import java.net.URI;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TargetValidatorTest {
    @Test
    void allowsPublicPrivateAndLoopbackTargets() throws Exception {
        var validator = validatorWith("127.0.0.1", "192.168.1.10", "93.184.216.34");

        assertThat(validator.validate(URI.create("http://localhost:8080/test")).addresses()).isNotEmpty();
        assertThat(validator.validate(URI.create("https://example.com/test")).uri().getScheme()).isEqualTo("https");
    }

    @Test
    void rejectsUnsupportedSchemeUserInfoAndInvalidPort() {
        var validator = validatorWith("93.184.216.34");

        assertThatThrownBy(() -> validator.validate(URI.create("file:///etc/passwd")))
                .isInstanceOf(InvalidTargetException.class);
        assertThatThrownBy(() -> validator.validate(URI.create("http://user:pass@example.com")))
                .isInstanceOf(InvalidTargetException.class);
        assertThatThrownBy(() -> validator.validate(new URI("http://example.com:99999")))
                .isInstanceOf(InvalidTargetException.class);
    }

    @Test
    void rejectsKnownMetadataHostnamesIncludingSubdomainsAndTrailingDot() {
        var validator = validatorWith("93.184.216.34");

        for (String host : List.of(
                "metadata.google.internal",
                "sub.metadata.google.internal",
                "instance-data.ec2.internal",
                "metadata.azure.com",
                "metadata.aliyuncs.com",
                "metadata.tencentyun.com.")) {
            assertThatThrownBy(() -> validator.validate(URI.create("http://" + host + "/latest")))
                    .as(host)
                    .isInstanceOf(BlockedTargetException.class);
        }
        assertThatThrownBy(() -> validator.validate(URI.create("http://METADATA.GOOGLE.INTERNAL./latest")))
                .isInstanceOf(BlockedTargetException.class);
    }

    @Test
    void rejectsAnyDnsCandidateInBlockedAddressRanges() throws Exception {
        var mixed = new TargetValidator(host -> new InetAddress[]{
                InetAddress.getByName("93.184.216.34"),
                InetAddress.getByName("169.254.10.20")
        });
        var ipv6 = validatorWith("fe80::1");
        var awsIpv6 = validatorWith("fd00:ec2::254");
        var aliyun = validatorWith("100.100.100.200");

        assertThatThrownBy(() -> mixed.validate(URI.create("http://example.com")))
                .isInstanceOf(BlockedTargetException.class);
        assertThatThrownBy(() -> ipv6.validate(URI.create("http://example.com")))
                .isInstanceOf(BlockedTargetException.class);
        assertThatThrownBy(() -> awsIpv6.validate(URI.create("http://example.com")))
                .isInstanceOf(BlockedTargetException.class);
        assertThatThrownBy(() -> aliyun.validate(URI.create("http://example.com")))
                .isInstanceOf(BlockedTargetException.class);
    }

    @Test
    void rejectsIpv4MappedIpv6MetadataAddressReturnedByDns() throws Exception {
        var mapped = Inet6Address.getByAddress(null, new byte[]{
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, (byte) 0xff, (byte) 0xff,
                (byte) 169, (byte) 254, (byte) 169, (byte) 254
        }, -1);
        var validator = new TargetValidator(host -> new InetAddress[]{
                InetAddress.getByName("93.184.216.34"), mapped
        });

        assertThatThrownBy(() -> validator.validate(URI.create("http://mixed.example")))
                .isInstanceOf(BlockedTargetException.class);
    }

    @Test
    void allowsIpv4MappedIpv6LoopbackAddressForLocalDebugging() throws Exception {
        var mappedLoopback = Inet6Address.getByAddress(null, new byte[]{
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, (byte) 0xff, (byte) 0xff,
                127, 0, 0, 1
        }, -1);
        var validator = new TargetValidator(host -> new InetAddress[]{mappedLoopback});

        assertThat(validator.validate(URI.create("http://local.example"))).isNotNull();
    }

    @Test
    void rejectsMetadataIpv4NumericAliasesOrInvalidForms() {
        var validator = new TargetValidator(host -> new InetAddress[]{
                InetAddress.getLoopbackAddress(),
                InetAddress.getByAddress(new byte[]{(byte) 169, (byte) 254, (byte) 169, (byte) 254})
        });

        for (String host : List.of("169.254.169.254", "2852039166", "0xa9fea9fe",
                "0251.0376.0251.0376", "169.254.169.254.")) {
            assertThatThrownBy(() -> validator.validate(URI.create("http://" + host + "/latest")))
                    .as(host)
                    .isInstanceOfAny(BlockedTargetException.class, InvalidTargetException.class);
        }
    }

    @Test
    void mapsEmptyOrFailedDnsResolutionToDedicatedError() {
        var empty = new TargetValidator(host -> new InetAddress[0]);
        var failed = new TargetValidator(host -> { throw new java.net.UnknownHostException(host); });

        assertThatThrownBy(() -> empty.validate(URI.create("http://example.com")))
                .isInstanceOf(DnsResolutionException.class);
        assertThatThrownBy(() -> failed.validate(URI.create("http://example.com")))
                .isInstanceOf(DnsResolutionException.class);
    }

    private static TargetValidator validatorWith(String... addresses) {
        return new TargetValidator(host -> {
            var result = new InetAddress[addresses.length];
            for (int i = 0; i < addresses.length; i++) {
                result[i] = InetAddress.getByName(addresses[i]);
            }
            return result;
        });
    }
}

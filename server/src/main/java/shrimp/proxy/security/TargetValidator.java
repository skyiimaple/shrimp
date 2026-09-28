package shrimp.proxy.security;

import org.springframework.stereotype.Component;

import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;

@Component
public class TargetValidator {
    private static final Set<String> METADATA_HOSTS = Set.of(
            "metadata.google.internal",
            "instance-data.ec2.internal",
            "metadata.azure.com",
            "metadata.aliyuncs.com",
            "metadata.tencentyun.com"
    );

    private final DnsResolver resolver;

    public TargetValidator() {
        this(InetAddress::getAllByName);
    }

    public TargetValidator(DnsResolver resolver) {
        this.resolver = resolver;
    }

    public ValidatedTarget validate(URI input) {
        if (input == null || input.isOpaque()) {
            throw new InvalidTargetException("URL 无效");
        }
        var scheme = input.getScheme() == null ? "" : input.getScheme().toLowerCase(Locale.ROOT);
        if (!scheme.equals("http") && !scheme.equals("https")) {
            throw new InvalidTargetException("仅支持 HTTP 和 HTTPS");
        }
        if (input.getRawUserInfo() != null || input.getFragment() != null) {
            throw new InvalidTargetException("URL 不允许包含用户信息或片段");
        }
        var host = normalizeHost(input.getHost());
        if (host == null || host.isBlank()) {
            throw new InvalidTargetException("URL 主机名无效");
        }
        if (input.getPort() < -1 || input.getPort() > 65535) {
            throw new InvalidTargetException("URL 端口无效");
        }
        if (isMetadataHost(host)) {
            throw new BlockedTargetException();
        }

        InetAddress[] addresses;
        try {
            addresses = resolver.resolve(host);
        } catch (Exception exception) {
            throw new DnsResolutionException(exception);
        }
        if (addresses == null || addresses.length == 0) {
            throw new DnsResolutionException();
        }
        if (Arrays.stream(addresses).anyMatch(TargetValidator::isBlockedAddress)) {
            throw new BlockedTargetException();
        }

        try {
            var normalized = new URI(scheme, null, host, input.getPort(),
                    input.getRawPath(), input.getRawQuery(), null).normalize();
            return new ValidatedTarget(normalized, Arrays.asList(addresses));
        } catch (URISyntaxException exception) {
            throw new InvalidTargetException("URL 无效", exception);
        }
    }

    private static String normalizeHost(String host) {
        if (host == null) {
            return null;
        }
        var normalized = host.toLowerCase(Locale.ROOT);
        while (normalized.endsWith(".")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private static boolean isMetadataHost(String host) {
        return METADATA_HOSTS.stream().anyMatch(blocked -> host.equals(blocked) || host.endsWith("." + blocked));
    }

    private static boolean isBlockedAddress(InetAddress address) {
        var bytes = address.getAddress();
        if (address instanceof Inet4Address) {
            var first = Byte.toUnsignedInt(bytes[0]);
            var second = Byte.toUnsignedInt(bytes[1]);
            if (first == 169 && second == 254) {
                return true;
            }
            return first == 100 && second == 100
                    && Byte.toUnsignedInt(bytes[2]) == 100 && Byte.toUnsignedInt(bytes[3]) == 200;
        }
        if (address instanceof Inet6Address) {
            var first = Byte.toUnsignedInt(bytes[0]);
            var second = Byte.toUnsignedInt(bytes[1]);
            if (first == 0xfe && (second & 0xc0) == 0x80) {
                return true;
            }
            byte[] awsMetadata = {(byte) 0xfd, 0x00, 0x0e, (byte) 0xc2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x02, 0x54};
            return Arrays.equals(bytes, awsMetadata);
        }
        return false;
    }
}

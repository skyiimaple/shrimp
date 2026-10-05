package shrimp.proxy.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URI;
import java.util.Locale;
import java.util.Set;

@Component
public class CrossSiteRequestFilter extends OncePerRequestFilter {
    private static final Set<String> LOCAL_ORIGIN_HOSTS = Set.of("localhost", "127.0.0.1", "::1");
    private final ObjectMapper objectMapper;

    public CrossSiteRequestFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !((request.getContextPath() + "/api/http/send").equals(request.getRequestURI())
                && ("POST".equals(request.getMethod()) || "OPTIONS".equals(request.getMethod())));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (isCrossSite(request)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            objectMapper.writeValue(response.getOutputStream(),
                    new ApiError("CROSS_SITE_REQUEST_BLOCKED", "跨站请求不允许访问本地代理"));
            return;
        }
        chain.doFilter(request, response);
    }

    private boolean isCrossSite(HttpServletRequest request) {
        var fetchSite = request.getHeader("Sec-Fetch-Site");
        if (fetchSite != null && fetchSite.equalsIgnoreCase("cross-site")) {
            return true;
        }
        var origins = request.getHeaders("Origin");
        if (origins == null || !origins.hasMoreElements()) {
            return false;
        }
        var origin = origins.nextElement();
        if (origins.hasMoreElements() || origin == null || origin.isBlank()) {
            return true;
        }
        return !isLocalOrigin(origin);
    }

    private boolean isLocalOrigin(String value) {
        try {
            var origin = URI.create(value.trim());
            var scheme = origin.getScheme();
            var host = origin.getHost();
            if (origin.isOpaque() || origin.getRawUserInfo() != null
                    || origin.getRawPath() != null && !origin.getRawPath().isEmpty()
                    || origin.getRawQuery() != null || origin.getRawFragment() != null
                    || value.indexOf(',') >= 0 || scheme == null || host == null
                    || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) {
                return false;
            }
            host = host.toLowerCase(Locale.ROOT);
            if (host.startsWith("[") && host.endsWith("]")) {
                host = host.substring(1, host.length() - 1);
            }
            return LOCAL_ORIGIN_HOSTS.contains(host);
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }
}

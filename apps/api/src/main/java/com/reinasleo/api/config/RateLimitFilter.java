package com.reinasleo.api.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;

@Component
@Order(1)
public class RateLimitFilter implements Filter {

    private static final int MAX_BUCKETS = 10_000;
    private static final Duration EVICTION_AFTER_ACCESS = Duration.ofMinutes(5);

    private final Cache<String, Bucket> authBuckets = buildCache();
    private final Cache<String, Bucket> botBuckets = buildCache();
    private final Cache<String, Bucket> contactBuckets = buildCache();

    private static Cache<String, Bucket> buildCache() {
        return Caffeine.newBuilder()
                .expireAfterAccess(EVICTION_AFTER_ACCESS)
                .maximumSize(MAX_BUCKETS)
                .build();
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;
        String path = req.getRequestURI();
        String ip = getClientIp(req);

        if (path.startsWith("/api/auth/")) {
            if (isRateLimited(authBuckets, ip, res, this::createAuthBucket)) return;
        } else if (path.startsWith("/api/bot/")) {
            if (isRateLimited(botBuckets, ip, res, this::createBotBucket)) return;
        } else if (path.equals("/api/contact") && "POST".equalsIgnoreCase(req.getMethod())) {
            if (isRateLimited(contactBuckets, ip, res, this::createContactBucket)) return;
        }

        chain.doFilter(request, response);
    }

    private boolean isRateLimited(Cache<String, Bucket> buckets, String ip, HttpServletResponse res,
                                   java.util.function.Supplier<Bucket> factory) throws IOException {
        Bucket bucket = buckets.get(ip, k -> factory.get());
        if (bucket == null || !bucket.tryConsume(1)) {
            res.setStatus(429);
            res.setContentType("application/json");
            res.getWriter().write("{\"message\":\"Too many requests. Try again later.\"}");
            return true;
        }
        return false;
    }

    private Bucket createAuthBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.simple(10, Duration.ofMinutes(1)))
                .build();
    }

    private Bucket createBotBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.simple(30, Duration.ofMinutes(1)))
                .build();
    }

    private Bucket createContactBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.simple(3, Duration.ofMinutes(1)))
                .build();
    }

    private String getClientIp(HttpServletRequest request) {
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isEmpty()) {
            return realIp.trim();
        }
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isEmpty()) {
            int comma = forwardedFor.indexOf(',');
            String first = comma >= 0 ? forwardedFor.substring(0, comma) : forwardedFor;
            return first.trim();
        }
        return request.getRemoteAddr();
    }
}

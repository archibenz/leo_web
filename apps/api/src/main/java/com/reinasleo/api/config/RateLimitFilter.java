package com.reinasleo.api.config;

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
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Order(1)
public class RateLimitFilter implements Filter {

    private final Map<String, Bucket> authBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> botBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> contactBuckets = new ConcurrentHashMap<>();

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

        evictStaleEntries();
        chain.doFilter(request, response);
    }

    private boolean isRateLimited(Map<String, Bucket> buckets, String ip, HttpServletResponse res,
                                   java.util.function.Supplier<Bucket> factory) throws IOException {
        Bucket bucket = buckets.computeIfAbsent(ip, k -> factory.get());
        if (!bucket.tryConsume(1)) {
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

    private void evictStaleEntries() {
        int maxSize = 10_000;
        if (authBuckets.size() > maxSize) authBuckets.clear();
        if (botBuckets.size() > maxSize) botBuckets.clear();
        if (contactBuckets.size() > maxSize) contactBuckets.clear();
    }

    private String getClientIp(HttpServletRequest request) {
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isEmpty()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}

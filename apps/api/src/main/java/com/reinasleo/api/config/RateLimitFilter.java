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

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;
        String path = req.getRequestURI();
        String ip = getClientIp(req);

        if (path.startsWith("/api/auth/")) {
            Bucket bucket = authBuckets.computeIfAbsent(ip, k -> createAuthBucket());
            if (!bucket.tryConsume(1)) {
                res.setStatus(429);
                res.setContentType("application/json");
                res.getWriter().write("{\"message\":\"Too many requests. Try again later.\"}");
                return;
            }
        } else if (path.startsWith("/api/bot/")) {
            Bucket bucket = botBuckets.computeIfAbsent(ip, k -> createBotBucket());
            if (!bucket.tryConsume(1)) {
                res.setStatus(429);
                res.setContentType("application/json");
                res.getWriter().write("{\"message\":\"Too many requests. Try again later.\"}");
                return;
            }
        }

        chain.doFilter(request, response);
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

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isEmpty()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}

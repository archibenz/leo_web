package com.reinasleo.api.security;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.reinasleo.api.model.User;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.time.Duration;
import java.util.UUID;

// Installed only inside the security chain, after JwtAuthFilter establishes the principal.
public class AnalyticsIdentityRateLimitFilter extends OncePerRequestFilter {
    private final Cache<UUID, Bucket> users = buckets();
    private final Cache<String, Bucket> unauthenticatedIps = buckets();
    private final Counter userHits;
    private final Counter unauthenticatedHits;

    public AnalyticsIdentityRateLimitFilter(MeterRegistry meters) {
        userHits = meters.counter("reinasleo.rate_limit.hit", "bucket", "analytics_identity");
        unauthenticatedHits = meters.counter("reinasleo.rate_limit.hit", "bucket", "analytics_identity_unauthenticated");
    }

    private static <K> Cache<K, Bucket> buckets() {
        return Caffeine.newBuilder().maximumSize(10_000).expireAfterAccess(Duration.ofMinutes(5)).build();
    }

    private static Bucket newBucket() {
        return Bucket.builder().addLimit(Bandwidth.simple(30, Duration.ofMinutes(1))).build();
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"GET".equals(request.getMethod()) || !"/api/auth/analytics-session".equals(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        UUID userId = authentication != null && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof User user ? user.getId() : null;
        // Invalid sessions behind an Analytics proxy must not consume any valid user's quota.
        Bucket bucket = userId == null
                ? unauthenticatedIps.get(request.getRemoteAddr(), ignored -> newBucket())
                : users.get(userId, ignored -> newBucket());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            chain.doFilter(request, response);
            return;
        }
        (userId == null ? unauthenticatedHits : userHits).increment();
        response.setStatus(429);
        response.setHeader("Retry-After", String.valueOf(Math.max(1, probe.getNanosToWaitForRefill() / 1_000_000_000L)));
        response.setContentType("application/json");
        response.getWriter().write("{\"message\":\"Too many requests. Try again later.\"}");
    }
}

package com.reinasleo.api.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
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
    private final Cache<String, Bucket> telegramBuckets = buildCache();
    private final Cache<String, Bucket> deleteChallengeBuckets = buildCache();
    private final Cache<String, Bucket> botBuckets = buildCache();
    private final Cache<String, Bucket> contactBuckets = buildCache();

    private final Counter authHitCounter;
    private final Counter telegramHitCounter;
    private final Counter deleteChallengeHitCounter;
    private final Counter botHitCounter;
    private final Counter contactHitCounter;

    public RateLimitFilter(MeterRegistry meters) {
        this.authHitCounter = hitCounter(meters, "auth");
        this.telegramHitCounter = hitCounter(meters, "telegram");
        this.deleteChallengeHitCounter = hitCounter(meters, "delete_challenge");
        this.botHitCounter = hitCounter(meters, "bot");
        this.contactHitCounter = hitCounter(meters, "contact");
    }

    private static Counter hitCounter(MeterRegistry meters, String bucket) {
        return Counter.builder("reinasleo.rate_limit.hit")
                .tag("bucket", bucket)
                .register(meters);
    }

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

        // Telegram polling (/api/auth/telegram/poll) needs frequent calls — frontend
        // polls every ~1s during the OAuth deep-link window. Separate it from the
        // password-auth bucket so legitimate poll traffic does not exhaust the
        // /api/auth/** allowance and so token-init farming sits in a smaller bucket.
        // Delete-challenge has a per-user (Telegram message) cost — narrower limit
        // discourages abuse-by-replay.
        if (path.equals("/api/auth/me/delete-challenge")) {
            if (isRateLimited(deleteChallengeBuckets, ip, res,
                    this::createDeleteChallengeBucket, deleteChallengeHitCounter)) return;
        } else if (path.startsWith("/api/auth/telegram/")) {
            if (isRateLimited(telegramBuckets, ip, res, this::createTelegramBucket, telegramHitCounter)) return;
        } else if (path.startsWith("/api/auth/")) {
            if (isRateLimited(authBuckets, ip, res, this::createAuthBucket, authHitCounter)) return;
        } else if (path.startsWith("/api/bot/")) {
            if (isRateLimited(botBuckets, ip, res, this::createBotBucket, botHitCounter)) return;
        } else if (path.equals("/api/contact") && "POST".equalsIgnoreCase(req.getMethod())) {
            if (isRateLimited(contactBuckets, ip, res, this::createContactBucket, contactHitCounter)) return;
        }

        chain.doFilter(request, response);
    }

    private boolean isRateLimited(Cache<String, Bucket> buckets, String ip, HttpServletResponse res,
                                   java.util.function.Supplier<Bucket> factory,
                                   Counter hitCounter) throws IOException {
        Bucket bucket = buckets.get(ip, k -> factory.get());
        if (bucket == null || !bucket.tryConsume(1)) {
            hitCounter.increment();
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

    private Bucket createTelegramBucket() {
        // 60 req/min: covers ~1s poll during the OAuth window plus init/exchange,
        // while still capping token-farming at 3600/hour per IP.
        return Bucket.builder()
                .addLimit(Bandwidth.simple(60, Duration.ofMinutes(1)))
                .build();
    }

    private Bucket createDeleteChallengeBucket() {
        // Each call sends a Telegram message — 3 per 15 min is enough for a
        // legitimate user retrying, and tight enough to make spam pointless.
        return Bucket.builder()
                .addLimit(Bandwidth.simple(3, Duration.ofMinutes(15)))
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
        // Prefer X-Real-IP — nginx in front sets this to the immediate peer IP
        // and the client cannot inject it. Fall back to the LAST entry of XFF
        // (the hop appended by our trusted proxy); earlier entries are
        // attacker-controllable and were causing rate-limit bypass when the
        // first XFF entry was trusted. Must stay in sync with
        // apps/web/app/api/newsletter/subscribe/route.ts::clientIp.
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isEmpty()) {
            return realIp.trim();
        }
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isEmpty()) {
            int lastComma = forwardedFor.lastIndexOf(',');
            String last = lastComma >= 0
                    ? forwardedFor.substring(lastComma + 1)
                    : forwardedFor;
            String trimmed = last.trim();
            if (!trimmed.isEmpty()) {
                return trimmed;
            }
        }
        return request.getRemoteAddr();
    }
}

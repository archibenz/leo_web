package com.reinasleo.api.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
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
    private final Cache<String, Bucket> checkoutBuckets = buildCache();
    private final Cache<String, Bucket> eventsBuckets = buildCache();
    private final Cache<String, Bucket> integrationsBuckets = buildCache();

    private final Counter authHitCounter;
    private final Counter telegramHitCounter;
    private final Counter deleteChallengeHitCounter;
    private final Counter botHitCounter;
    private final Counter contactHitCounter;
    private final Counter checkoutHitCounter;
    private final Counter eventsHitCounter;
    private final Counter integrationsHitCounter;

    // Единственный предел в этом фильтре, вынесенный в настройку. Причина не в
    // том, что он особенный, а в том, что набор тестов бьёт в ручку 14 раз, и
    // боевое значение 10/мин честно его срезает. Ослабить боевое ради тестов
    // значило бы поменять защиту под удобство проверки; вместо этого тестовый
    // профиль поднимает планку, а отдельный тест с низкой планкой доказывает,
    // что сторож срабатывает. Заодно число становится правимым на проде без
    // пересборки — на случай, если отправитель однажды начнёт ходить чаще.
    private final int integrationsPerMinute;

    public RateLimitFilter(MeterRegistry meters,
                           @Value("${app.rate-limit.integrations-per-minute:10}") int integrationsPerMinute) {
        this.integrationsPerMinute = integrationsPerMinute;
        this.authHitCounter = hitCounter(meters, "auth");
        this.telegramHitCounter = hitCounter(meters, "telegram");
        this.deleteChallengeHitCounter = hitCounter(meters, "delete_challenge");
        this.botHitCounter = hitCounter(meters, "bot");
        this.contactHitCounter = hitCounter(meters, "contact");
        this.checkoutHitCounter = hitCounter(meters, "checkout");
        this.eventsHitCounter = hitCounter(meters, "events");
        this.integrationsHitCounter = hitCounter(meters, "integrations");
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
        } else if (path.equals("/api/checkout") && "POST".equalsIgnoreCase(req.getMethod())) {
            // Webhook /api/payments/yookassa/webhook намеренно НЕ лимитируется:
            // лимит по IP мог бы дропнуть легитимные ретраи YooKassa.
            if (isRateLimited(checkoutBuckets, ip, res, this::createCheckoutBucket, checkoutHitCounter)) return;
        } else if (path.equals("/api/events") && "POST".equalsIgnoreCase(req.getMethod())) {
            if (isRateLimited(eventsBuckets, ip, res, this::createEventsBucket, eventsHitCounter)) return;
        } else if (path.startsWith("/api/integrations/")) {
            if (isRateLimited(integrationsBuckets, ip, res, this::createIntegrationsBucket, integrationsHitCounter)) return;
        }

        chain.doFilter(request, response);
    }

    private boolean isRateLimited(Cache<String, Bucket> buckets, String ip, HttpServletResponse res,
                                   java.util.function.Supplier<Bucket> factory,
                                   Counter hitCounter) throws IOException {
        Bucket bucket = buckets.get(ip, k -> factory.get());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            return false;
        }
        hitCounter.increment();
        // RFC 6585 §4: Retry-After tells the client when to back off until.
        // bucket4j returns nanos until enough tokens refill for one consume.
        long retryAfterSeconds = Math.max(1, probe.getNanosToWaitForRefill() / 1_000_000_000L);
        res.setStatus(429);
        res.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
        res.setContentType("application/json");
        res.getWriter().write("{\"message\":\"Too many requests. Try again later.\"}");
        return true;
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

    private Bucket createIntegrationsBucket() {
        // Приём цен от аналитики ходит РАЗ В СУТКИ одним запросом, поэтому
        // предел здесь не про легитимную нагрузку — в неё уложится и десяток
        // повторов при сбое. Он про другое: путь стоит под permitAll (реальная
        // проверка — секрет в контроллере), nginx уводит на Spring ВСЕ /api/*,
        // значит ручка достижима снаружи, а тело разбирается раньше, чем
        // сверяется секрет: @RequestBody резолвится до входа в метод. Без
        // предела кто угодно, нашедший путь, заставляет нас разбирать пачки до
        // 500 строк сколько угодно раз. Секрет при этом не утекает и записи не
        // происходит — это сторож от расхода, а не от доступа.
        //
        // Заведён ДО первой выкатки намеренно: ставить предел на работающую
        // ручку страшнее — каждая правка числа обсуждалась бы с оглядкой «не
        // оборвём ли живую отправку».
        return Bucket.builder()
                .addLimit(Bandwidth.simple(integrationsPerMinute, Duration.ofMinutes(1)))
                .build();
    }

    private Bucket createContactBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.simple(3, Duration.ofMinutes(1)))
                .build();
    }

    private Bucket createCheckoutBucket() {
        // Каждый вызов создаёт платёж у YooKassa и декрементит сток — 5/мин
        // на IP хватает легитимному покупателю (ретраи карт), фарм дорог.
        return Bucket.builder()
                .addLimit(Bandwidth.simple(5, Duration.ofMinutes(1)))
                .build();
    }

    private Bucket createEventsBucket() {
        // Пачка до 20 событий за вызов, флаш на visibilitychange/pagehide —
        // за сессию покупки это единицы вызовов, но за общим IP (офис, NAT)
        // сидит много вкладок сразу. 60/мин с запасом покрывает нормальный
        // просмотр и всё равно ограничивает шторм: событие дешевле запроса
        // (см. риски в плане), лимит держит именно частоту запросов.
        return Bucket.builder()
                .addLimit(Bandwidth.simple(60, Duration.ofMinutes(1)))
                .build();
    }

    private String getClientIp(HttpServletRequest request) {
        // Prefer X-Real-IP — nginx in front sets this to the immediate peer IP
        // and the client cannot inject it. Fall back to the LAST entry of XFF
        // (the hop appended by our trusted proxy); earlier entries are
        // attacker-controllable and were causing rate-limit bypass when the
        // first XFF entry was trusted. Must stay in sync with
        // apps/web/app/api/newsletter/subscribe/route.ts::clientIp.
        // Proxy headers are only meaningful when the request actually came
        // through the local nginx — a direct hit must not spoof its way past
        // the limiter.
        String remote = request.getRemoteAddr();
        boolean fromTrustedProxy = "127.0.0.1".equals(remote) || "::1".equals(remote)
                || "0:0:0:0:0:0:0:1".equals(remote);
        if (!fromTrustedProxy) {
            return remote;
        }
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

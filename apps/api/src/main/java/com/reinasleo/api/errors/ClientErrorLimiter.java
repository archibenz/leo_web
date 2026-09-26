package com.reinasleo.api.errors;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Лимит ручки POST /api/client-errors — внутри неё самой, а не в
 * RateLimitFilter (решение оркестратора 26.09: фильтр без решения владельца не
 * трогаем). Ручка открыта без входа, и без лимита стала бы дверью для спама в
 * аналитику: на IP — 20 пачек в минуту, на всех разом — 600.
 */
@Component
public class ClientErrorLimiter {

    static final int PER_IP_PER_MINUTE = 20;
    static final int GLOBAL_PER_MINUTE = 600;

    private final Cache<String, Bucket> perIp = Caffeine.newBuilder()
            .maximumSize(10_000)
            .expireAfterAccess(Duration.ofMinutes(5))
            .build();
    private final Bucket global = bucket(GLOBAL_PER_MINUTE);

    private static Bucket bucket(int perMinute) {
        return Bucket.builder().addLimit(Bandwidth.simple(perMinute, Duration.ofMinutes(1))).build();
    }

    public boolean tryAcquire(String ip) {
        Bucket own = perIp.get(ip, k -> bucket(PER_IP_PER_MINUTE));
        return own.tryConsume(1) && global.tryConsume(1);
    }
}

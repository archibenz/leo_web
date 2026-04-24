package com.reinasleo.api.service;

import com.reinasleo.api.repository.TelegramAuthTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
public class TelegramAuthCleanupService {

    private static final Logger log = LoggerFactory.getLogger(TelegramAuthCleanupService.class);

    private final TelegramAuthTokenRepository repository;

    public TelegramAuthCleanupService(TelegramAuthTokenRepository repository) {
        this.repository = repository;
    }

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void purgeExpired() {
        Instant cutoff = Instant.now().minus(1, ChronoUnit.DAYS);
        int removed = repository.deleteExpiredBefore(cutoff);
        if (removed > 0) {
            log.info("Purged {} expired telegram auth tokens (cutoff {})", removed, cutoff);
        }
    }
}

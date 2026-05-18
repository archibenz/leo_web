package com.reinasleo.api.service;

import com.reinasleo.api.repository.TelegramDeleteChallengeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
public class TelegramDeleteChallengeCleanupTask {

    private static final Logger log = LoggerFactory.getLogger(TelegramDeleteChallengeCleanupTask.class);
    private static final int RETENTION_HOURS = 24;

    private final TelegramDeleteChallengeRepository repository;

    public TelegramDeleteChallengeCleanupTask(TelegramDeleteChallengeRepository repository) {
        this.repository = repository;
    }

    @Scheduled(cron = "0 15 3 * * *", zone = "UTC")
    @Transactional
    public void purgeExpired() {
        Instant cutoff = Instant.now().minus(RETENTION_HOURS, ChronoUnit.HOURS);
        int removed = repository.deleteByExpiresAtBefore(cutoff);
        if (removed > 0) {
            log.info("Purged {} expired telegram delete challenges (cutoff {})", removed, cutoff);
        }
    }
}

package com.reinasleo.api.service;

import com.reinasleo.api.repository.VerificationCodeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
public class VerificationCodeCleanupTask {

    private static final Logger log = LoggerFactory.getLogger(VerificationCodeCleanupTask.class);
    private static final int RETENTION_DAYS = 7;

    private final VerificationCodeRepository repository;

    public VerificationCodeCleanupTask(VerificationCodeRepository repository) {
        this.repository = repository;
    }

    @Scheduled(cron = "0 0 3 * * *", zone = "UTC")
    @Transactional
    public void purgeExpired() {
        Instant cutoff = Instant.now().minus(RETENTION_DAYS, ChronoUnit.DAYS);
        int removed = repository.deleteByExpiresAtBefore(cutoff);
        if (removed > 0) {
            log.info("Purged {} expired verification codes (cutoff {})", removed, cutoff);
        }
    }
}

package com.reinasleo.api.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "telegram_delete_challenges")
public class TelegramDeleteChallenge {

    @Id
    @Column(name = "telegram_id")
    private Long telegramId;

    @Column(name = "code_hash", nullable = false, length = 64)
    private String codeHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "failed_attempts", nullable = false)
    private int failedAttempts;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected TelegramDeleteChallenge() {}

    public TelegramDeleteChallenge(Long telegramId, String codeHash, Instant expiresAt) {
        this.telegramId = telegramId;
        this.codeHash = codeHash;
        this.expiresAt = expiresAt;
        this.failedAttempts = 0;
    }

    @PrePersist
    void prePersist() {
        if (this.createdAt == null) this.createdAt = Instant.now();
    }

    public void rotate(String newCodeHash, Instant newExpiresAt) {
        this.codeHash = newCodeHash;
        this.expiresAt = newExpiresAt;
        this.failedAttempts = 0;
    }

    public void incrementFailedAttempts() {
        this.failedAttempts++;
    }

    public Long getTelegramId() { return telegramId; }
    public String getCodeHash() { return codeHash; }
    public Instant getExpiresAt() { return expiresAt; }
    public int getFailedAttempts() { return failedAttempts; }
    public Instant getCreatedAt() { return createdAt; }
}

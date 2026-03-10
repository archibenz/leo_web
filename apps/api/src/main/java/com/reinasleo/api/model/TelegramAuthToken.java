package com.reinasleo.api.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "telegram_auth_tokens")
public class TelegramAuthToken {

    @Id
    @Column(length = 64)
    private String token;

    @Column(name = "telegram_id", nullable = false)
    private Long telegramId;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private boolean used;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected TelegramAuthToken() {}

    public TelegramAuthToken(String token, Long telegramId, Instant expiresAt) {
        this.token = token;
        this.telegramId = telegramId;
        this.expiresAt = expiresAt;
        this.used = false;
        this.createdAt = Instant.now();
    }

    public void markUsed() {
        this.used = true;
    }

    public String getToken() { return token; }
    public Long getTelegramId() { return telegramId; }
    public UUID getUserId() { return userId; }
    public Instant getExpiresAt() { return expiresAt; }
    public boolean isUsed() { return used; }
    public Instant getCreatedAt() { return createdAt; }

    public void setUserId(UUID userId) { this.userId = userId; }
    public void setTelegramId(Long telegramId) { this.telegramId = telegramId; }
}

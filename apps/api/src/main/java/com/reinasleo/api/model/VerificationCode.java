package com.reinasleo.api.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "verification_codes")
public class VerificationCode {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(nullable = false, length = 6)
    private String code;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private boolean used;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected VerificationCode() {}

    public VerificationCode(String email, String code, Instant expiresAt) {
        this.email = email;
        this.code = code;
        this.expiresAt = expiresAt;
        this.used = false;
    }

    @PrePersist
    void prePersist() {
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getCode() { return code; }
    public Instant getExpiresAt() { return expiresAt; }
    public boolean isUsed() { return used; }
    public Instant getCreatedAt() { return createdAt; }

    public void markUsed() { this.used = true; }
}

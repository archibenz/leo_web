package com.reinasleo.api.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(length = 255)
    private String email;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(length = 255)
    private String surname;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(name = "telegram_id")
    private Long telegramId;

    @Column(length = 20)
    private String phone;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(nullable = false)
    private boolean newsletter;

    @Column(name = "privacy_accepted", nullable = false)
    private boolean privacyAccepted;

    @Column(nullable = false, length = 32)
    private String role = "user";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected User() {}

    public User(String email, String name, String surname, String passwordHash,
                LocalDate dateOfBirth, boolean newsletter, boolean privacyAccepted) {
        this.email = email;
        this.name = name;
        this.surname = surname;
        this.passwordHash = passwordHash;
        this.dateOfBirth = dateOfBirth;
        this.newsletter = newsletter;
        this.privacyAccepted = privacyAccepted;
    }

    public User(Long telegramId, String phone, String name) {
        this.telegramId = telegramId;
        this.phone = phone;
        this.name = name;
        this.privacyAccepted = true;
    }

    @PrePersist
    void prePersist() {
        var now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getName() { return name; }
    public String getSurname() { return surname; }
    public String getPasswordHash() { return passwordHash; }
    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public boolean isNewsletter() { return newsletter; }
    public boolean isPrivacyAccepted() { return privacyAccepted; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Long getTelegramId() { return telegramId; }
    public String getPhone() { return phone; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public void setEmail(String email) { this.email = email; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public void setTelegramId(Long telegramId) { this.telegramId = telegramId; }
    public void setPhone(String phone) { this.phone = phone; }
    public void setSurname(String surname) { this.surname = surname; }

    public String getFullName() {
        if (surname == null || surname.isBlank()) return name;
        return name + " " + surname;
    }
}

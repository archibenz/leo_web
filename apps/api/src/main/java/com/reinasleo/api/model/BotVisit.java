package com.reinasleo.api.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "bot_visits")
public class BotVisit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "telegram_id", nullable = false)
    private Long telegramId;

    @Column(length = 255)
    private String username;

    @Column(name = "first_name", length = 255)
    private String firstName;

    @Column(name = "last_name", length = 255)
    private String lastName;

    @Column(name = "language_code", length = 8)
    private String languageCode;

    @Column(nullable = false, length = 32)
    private String source = "organic";

    @Column(name = "visited_at", nullable = false)
    private Instant visitedAt;

    protected BotVisit() {}

    public BotVisit(Long telegramId, String username, String firstName, String lastName,
                    String languageCode, String source) {
        this.telegramId = telegramId;
        this.username = username;
        this.firstName = firstName;
        this.lastName = lastName;
        this.languageCode = languageCode;
        this.source = source != null ? source : "organic";
    }

    @PrePersist
    void prePersist() {
        if (this.visitedAt == null) {
            this.visitedAt = Instant.now();
        }
    }

    public UUID getId() { return id; }
    public Long getTelegramId() { return telegramId; }
    public String getUsername() { return username; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public String getLanguageCode() { return languageCode; }
    public String getSource() { return source; }
    public Instant getVisitedAt() { return visitedAt; }
}

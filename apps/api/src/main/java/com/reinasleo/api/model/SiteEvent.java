package com.reinasleo.api.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "site_events")
public class SiteEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "event_type", nullable = false, length = 32)
    private String eventType;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "session_key", length = 64)
    private String sessionKey;

    // Raw scalar, not @ManyToOne User: deleteAccount() clears this column with a
    // bulk UPDATE (SiteEventRepository.clearUserId), and export only ever needs
    // the id — loading the full User for every row would be a wasted join.
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "product_id", length = 128)
    private String productId;

    @Column(name = "model_id")
    private UUID modelId;

    @Column(length = 256)
    private String path;

    @Column(length = 8)
    private String locale;

    @Column(length = 16)
    private String device;

    @Column(length = 16)
    private String marketplace;

    public SiteEvent() {}

    @PrePersist
    void prePersist() {
        if (occurredAt == null) {
            occurredAt = Instant.now();
        }
    }

    public UUID getId() { return id; }
    public String getEventType() { return eventType; }
    public Instant getOccurredAt() { return occurredAt; }
    public String getSessionKey() { return sessionKey; }
    public UUID getUserId() { return userId; }
    public String getProductId() { return productId; }
    public UUID getModelId() { return modelId; }
    public String getPath() { return path; }
    public String getLocale() { return locale; }
    public String getDevice() { return device; }
    public String getMarketplace() { return marketplace; }

    public void setEventType(String eventType) { this.eventType = eventType; }
    public void setSessionKey(String sessionKey) { this.sessionKey = sessionKey; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public void setProductId(String productId) { this.productId = productId; }
    public void setModelId(UUID modelId) { this.modelId = modelId; }
    public void setPath(String path) { this.path = path; }
    public void setLocale(String locale) { this.locale = locale; }
    public void setDevice(String device) { this.device = device; }
    public void setMarketplace(String marketplace) { this.marketplace = marketplace; }
}

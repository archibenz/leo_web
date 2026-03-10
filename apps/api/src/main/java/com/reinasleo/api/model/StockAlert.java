package com.reinasleo.api.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "stock_alerts")
public class StockAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "product_id", nullable = false, length = 128)
    private String productId;

    @Column(name = "alert_type", nullable = false, length = 32)
    private String alertType;

    @Column(nullable = false)
    private boolean acknowledged = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected StockAlert() {}

    public StockAlert(String productId, String alertType) {
        this.productId = productId;
        this.alertType = alertType;
    }

    @PrePersist
    void prePersist() {
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getProductId() { return productId; }
    public String getAlertType() { return alertType; }
    public boolean isAcknowledged() { return acknowledged; }
    public Instant getCreatedAt() { return createdAt; }

    public void setAcknowledged(boolean acknowledged) { this.acknowledged = acknowledged; }
}

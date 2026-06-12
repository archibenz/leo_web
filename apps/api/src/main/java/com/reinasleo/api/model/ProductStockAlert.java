package com.reinasleo.api.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "product_stock_alerts")
public class ProductStockAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "product_id", nullable = false, length = 128)
    private String productId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ProductStockAlert() {}

    public ProductStockAlert(UUID userId, String productId) {
        this.userId = userId;
        this.productId = productId;
    }

    @PrePersist
    void prePersist() {
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getProductId() { return productId; }
    public Instant getCreatedAt() { return createdAt; }
}

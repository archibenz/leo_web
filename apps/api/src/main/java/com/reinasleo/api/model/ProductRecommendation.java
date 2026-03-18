package com.reinasleo.api.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "product_recommendations")
public class ProductRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "product_id", nullable = false, length = 128)
    private String productId;

    @Column(name = "recommended_product_id", nullable = false, length = 128)
    private String recommendedProductId;

    @Column(name = "sort_order")
    private int sortOrder = 0;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public ProductRecommendation() {}

    @PrePersist
    void prePersist() {
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getProductId() { return productId; }
    public String getRecommendedProductId() { return recommendedProductId; }
    public int getSortOrder() { return sortOrder; }
    public Instant getCreatedAt() { return createdAt; }

    public void setProductId(String productId) { this.productId = productId; }
    public void setRecommendedProductId(String recommendedProductId) { this.recommendedProductId = recommendedProductId; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
}

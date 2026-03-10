package com.reinasleo.api.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "product_interest_events")
public class ProductInterestEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "event_type", nullable = false, length = 32)
    private String eventType;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ProductInterestEvent() {}

    public ProductInterestEvent(User user, Product product, String eventType) {
        this.user = user;
        this.product = product;
        this.eventType = eventType;
    }

    @PrePersist
    void prePersist() {
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public User getUser() { return user; }
    public Product getProduct() { return product; }
    public String getEventType() { return eventType; }
    public Instant getCreatedAt() { return createdAt; }
}

package com.reinasleo.api.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Один Order → много Payment attempts. Это позволяет:
 *  - Retry на failed cards (юзер пробует другую карту → новый Payment row)
 *  - Partial refunds (каждый refund отдельная provider transaction со своим
 *    external_payment_id)
 *  - Audit trail всех попыток
 *
 * orders.payment_status денормализован из latest non-failed Payment.status.
 * Источник истины — payments table.
 *
 * UNIQUE(provider, external_payment_id) обеспечивает идемпотентность при
 * параллельных webhook'ах.
 */
@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(nullable = false, length = 16)
    private String provider;

    @Column(name = "external_payment_id", nullable = false, length = 255)
    private String externalPaymentId;

    @Column(nullable = false, length = 32)
    private String status;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "refunded_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal refundedAmount = BigDecimal.ZERO;

    @Column(name = "captured_at")
    private Instant capturedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    protected Payment() {}

    public Payment(Order order, String provider, String externalPaymentId, BigDecimal amount, String status) {
        this.order = order;
        this.provider = provider;
        this.externalPaymentId = externalPaymentId;
        this.amount = amount;
        this.status = status;
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
    public Order getOrder() { return order; }
    public String getProvider() { return provider; }
    public String getExternalPaymentId() { return externalPaymentId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public BigDecimal getAmount() { return amount; }
    public BigDecimal getRefundedAmount() { return refundedAmount; }
    public void setRefundedAmount(BigDecimal refundedAmount) { this.refundedAmount = refundedAmount; }
    public Instant getCapturedAt() { return capturedAt; }
    public void setCapturedAt(Instant capturedAt) { this.capturedAt = capturedAt; }
    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Long getVersion() { return version; }
}

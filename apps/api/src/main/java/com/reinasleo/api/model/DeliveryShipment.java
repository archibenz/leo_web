package com.reinasleo.api.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Tracking посылки. Создаётся после `paid` event (через
 * @TransactionalEventListener) → ApiShipService.createShipment() → row в
 * этой таблице.
 *
 * aggregator: 'APISHIP' (MVP) | 'OZON_DIRECT' (Phase 7 future).
 * provider: enum DeliveryProvider (CDEK, BOXBERRY, ...).
 * external_order_id: Apiship internal orderId.
 * tracking_number: service-level (СДЭК/Boxberry/...) — клиент видит на их сайтах.
 *
 * status_updates JSONB — массив status events от webhook'ов Apiship'а.
 * Каждый element: {timestamp, status, location, raw_event_id}.
 */
@Entity
@Table(name = "delivery_shipments")
public class DeliveryShipment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(nullable = false, length = 16)
    private String aggregator = "APISHIP";

    @Column(nullable = false, length = 32)
    private String provider;

    @Column(name = "external_order_id", nullable = false, length = 255)
    private String externalOrderId;

    @Column(name = "tracking_number", length = 255)
    private String trackingNumber;

    @Column(name = "label_url", length = 1024)
    private String labelUrl;

    @Column(length = 64)
    private String status;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "status_updates", columnDefinition = "jsonb", nullable = false)
    private List<Map<String, Object>> statusUpdates = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    protected DeliveryShipment() {}

    public DeliveryShipment(Order order, String aggregator, String provider, String externalOrderId) {
        this.order = order;
        this.aggregator = aggregator;
        this.provider = provider;
        this.externalOrderId = externalOrderId;
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
    public String getAggregator() { return aggregator; }
    public String getProvider() { return provider; }
    public String getExternalOrderId() { return externalOrderId; }
    public String getTrackingNumber() { return trackingNumber; }
    public void setTrackingNumber(String trackingNumber) { this.trackingNumber = trackingNumber; }
    public String getLabelUrl() { return labelUrl; }
    public void setLabelUrl(String labelUrl) { this.labelUrl = labelUrl; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public List<Map<String, Object>> getStatusUpdates() { return statusUpdates; }
    public void setStatusUpdates(List<Map<String, Object>> statusUpdates) { this.statusUpdates = statusUpdates; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Long getVersion() { return version; }
}

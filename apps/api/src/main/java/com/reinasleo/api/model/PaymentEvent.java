package com.reinasleo.api.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Лог входящих webhook events от платёжных провайдеров. Существование row
 * с заданным (provider, external_event_id) = event уже обработан.
 *
 * Используется в WebhookController через atomic insert pattern:
 *   INSERT INTO payment_events (...) VALUES (...) ON CONFLICT DO NOTHING RETURNING id
 *
 * Если RETURNING пуст → return 200 (idempotent). Если non-empty → process
 * state transition в той же транзакции.
 *
 * raw_payload хранится с masked PII (через PaymentEventSanitizer перед
 * persist). 152-ФЗ Art.5(7) data minimization.
 */
@Entity
@Table(name = "payment_events")
public class PaymentEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 16)
    private String provider;

    @Column(name = "external_event_id", nullable = false, length = 255)
    private String externalEventId;

    @Column(name = "event_type", nullable = false, length = 64)
    private String eventType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id")
    private Payment payment;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_payload", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> rawPayload;

    @Column(name = "received_at", nullable = false, updatable = false)
    private Instant receivedAt;

    protected PaymentEvent() {}

    public PaymentEvent(String provider, String externalEventId, String eventType,
                        Payment payment, Map<String, Object> rawPayload) {
        this.provider = provider;
        this.externalEventId = externalEventId;
        this.eventType = eventType;
        this.payment = payment;
        this.rawPayload = rawPayload;
    }

    @PrePersist
    void prePersist() {
        if (this.receivedAt == null) {
            this.receivedAt = Instant.now();
        }
    }

    public UUID getId() { return id; }
    public String getProvider() { return provider; }
    public String getExternalEventId() { return externalEventId; }
    public String getEventType() { return eventType; }
    public Payment getPayment() { return payment; }
    public void setPayment(Payment payment) { this.payment = payment; }
    public Map<String, Object> getRawPayload() { return rawPayload; }
    public Instant getReceivedAt() { return receivedAt; }
}

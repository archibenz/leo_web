package com.reinasleo.api.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 32)
    private String status = "pending";

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    // --- Checkout subsystem fields (V24, added 2026-05-24) ---
    // payment_status денормализован из payments.status для быстрой
    // фильтрации в админке. Источник истины — последняя active row в payments.
    @Column(name = "payment_status", length = 32)
    private String paymentStatus;

    // delivery_provider — enum value (CDEK | BOXBERRY | ... | OTHER).
    // Mapping из Apiship providerKey происходит в ApiShipService.mapProvider().
    @Column(name = "delivery_provider", length = 32)
    private String deliveryProvider;

    // delivery_provider_meta — raw payload если provider = 'OTHER'
    // (escape valve для новых служб которые Apiship добавил без redeploy).
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "delivery_provider_meta", columnDefinition = "jsonb")
    private Map<String, Object> deliveryProviderMeta;

    // delivery_method — 'pvz' (самовывоз) | 'courier' (курьер) | 'postamat'.
    @Column(name = "delivery_method", length = 64)
    private String deliveryMethod;

    @Column(name = "delivery_cost", precision = 12, scale = 2)
    private BigDecimal deliveryCost;

    // delivery_address — snapshot адреса доставки. JSONB inline в orders
    // (не отдельная таблица) — заказ это исторический документ, адрес не
    // должен меняться при edit профиля юзером. 152-ФЗ Art.5(7) минимизация.
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "delivery_address", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> deliveryAddress = new HashMap<>();

    @Column(name = "customer_email", length = 255)
    private String customerEmail;

    @Column(name = "customer_phone", length = 32)
    private String customerPhone;

    @Column(name = "customer_name", length = 255)
    private String customerName;

    // idempotency_key — UUID от клиента в header `Idempotency-Key`. Защита
    // от двойного клика на POST /checkout. UNIQUE partial index, NULL для
    // legacy orders.
    @Column(name = "idempotency_key", length = 64)
    private String idempotencyKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Order() {}

    public Order(User user, BigDecimal total) {
        this.user = user;
        this.total = total;
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
    public User getUser() { return user; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public BigDecimal getTotal() { return total; }
    public List<OrderItem> getItems() { return items; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getDeliveryProvider() { return deliveryProvider; }
    public void setDeliveryProvider(String deliveryProvider) { this.deliveryProvider = deliveryProvider; }

    public Map<String, Object> getDeliveryProviderMeta() { return deliveryProviderMeta; }
    public void setDeliveryProviderMeta(Map<String, Object> deliveryProviderMeta) { this.deliveryProviderMeta = deliveryProviderMeta; }

    public String getDeliveryMethod() { return deliveryMethod; }
    public void setDeliveryMethod(String deliveryMethod) { this.deliveryMethod = deliveryMethod; }

    public BigDecimal getDeliveryCost() { return deliveryCost; }
    public void setDeliveryCost(BigDecimal deliveryCost) { this.deliveryCost = deliveryCost; }

    public Map<String, Object> getDeliveryAddress() { return deliveryAddress; }
    public void setDeliveryAddress(Map<String, Object> deliveryAddress) { this.deliveryAddress = deliveryAddress; }

    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }

    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
}

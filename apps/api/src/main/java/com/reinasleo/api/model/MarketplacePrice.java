package com.reinasleo.api.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

// Пара (product_id, source) не заявлена здесь как @Table(uniqueConstraints=...)
// нарочно: в проде идемпотентность держит ux_marketplace_prices_product_source
// (V35, UNIQUE NULLS NOT DISTINCT — обычный JPA-аннотированный UNIQUE так не
// умеет). Тесты собирают схему через Hibernate (ddl-auto=create-drop, Flyway
// выключен), и без реплики constraint'а идемпотентность в тестах проверяет
// ИМЕННО код MarketplacePriceIntakeService (upsert по чтению перед записью),
// а не БД за него — так задуманная мутация «insert вместо upsert» ломает
// тест наблюдаемо (дубли строк), а не тонет в исключении о нарушенном ключе.
@Entity
@Table(name = "marketplace_prices")
public class MarketplacePrice {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "product_id", nullable = false, length = 128)
    private String productId;

    // NULL — себестоимость без пары с площадкой (см. V35). Raw-строка, не
    // enum: список источников уже закрыт Bean Validation на входе
    // (MarketplacePriceItemRequest) и CHECK на входе в БД, третьего места
    // одному и тому же правилу тут не нужно.
    @Column(length = 16)
    private String source;

    @Column(name = "buyer_price_kop")
    private Long buyerPriceKop;

    @Column(name = "cost_price_kop")
    private Long costPriceKop;

    // Момент наблюдения на площадке — приходит от отправителя как есть, сюда
    // не подставляется now().
    @Column(name = "captured_at", nullable = false)
    private Instant capturedAt;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt;

    public MarketplacePrice() {}

    public UUID getId() { return id; }
    public String getProductId() { return productId; }
    public String getSource() { return source; }
    public Long getBuyerPriceKop() { return buyerPriceKop; }
    public Long getCostPriceKop() { return costPriceKop; }
    public Instant getCapturedAt() { return capturedAt; }
    public Instant getReceivedAt() { return receivedAt; }

    public void setProductId(String productId) { this.productId = productId; }
    public void setSource(String source) { this.source = source; }
    public void setBuyerPriceKop(Long buyerPriceKop) { this.buyerPriceKop = buyerPriceKop; }
    public void setCostPriceKop(Long costPriceKop) { this.costPriceKop = costPriceKop; }
    public void setCapturedAt(Instant capturedAt) { this.capturedAt = capturedAt; }
    public void setReceivedAt(Instant receivedAt) { this.receivedAt = receivedAt; }
}

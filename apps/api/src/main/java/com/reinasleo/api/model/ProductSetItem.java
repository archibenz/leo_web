package com.reinasleo.api.model;

import jakarta.persistence.*;

import java.util.UUID;

@Entity
@Table(name = "product_set_items")
public class ProductSetItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "set_id", nullable = false)
    private UUID setId;

    @Column(name = "product_id", nullable = false, length = 128)
    private String productId;

    @Column(nullable = false)
    private int position = 0;

    public ProductSetItem() {}

    public UUID getId() { return id; }
    public UUID getSetId() { return setId; }
    public String getProductId() { return productId; }
    public int getPosition() { return position; }

    public void setSetId(UUID setId) { this.setId = setId; }
    public void setProductId(String productId) { this.productId = productId; }
    public void setPosition(int position) { this.position = position; }
}

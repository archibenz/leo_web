package com.reinasleo.api.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "products")
public class Product {

    @Id
    @Column(length = 128)
    private String id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(precision = 12, scale = 2)
    private BigDecimal price;

    @Column(length = 512)
    private String image;

    @Column(length = 128)
    private String category;

    @Column(columnDefinition = "TEXT ARRAY")
    private String[] sizes;

    @Column(name = "collection_id")
    private UUID collectionId;

    @Column(name = "stock_quantity", nullable = false)
    private int stockQuantity = 0;

    @Column(name = "low_stock_threshold", nullable = false)
    private int lowStockThreshold = 5;

    @Column(name = "is_test", nullable = false)
    private boolean isTest = false;

    @Column(nullable = false)
    private boolean active = true;

    @Column(length = 64)
    private String occasion;

    @Column(length = 64)
    private String color;

    @Column(length = 64)
    private String material;

    @Column(length = 255)
    private String subtitle;

    @Column(length = 64)
    private String sku;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String images = "[]";

    @Column(name = "model_id")
    private UUID modelId;

    @Column(name = "color_key", length = 32)
    private String colorKey;

    @Column(name = "color_hex", length = 7)
    private String colorHex;

    @Column(name = "color_name_ru", length = 64)
    private String colorNameRu;

    @Column(name = "color_name_en", length = 64)
    private String colorNameEn;

    @Column
    private Long nm;

    @Column(name = "sale_price", precision = 12, scale = 2)
    private BigDecimal salePrice;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "care_instructions", columnDefinition = "jsonb")
    private String careInstructions;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Product() {}

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

    // Getters
    public String getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public BigDecimal getPrice() { return price; }
    public String getImage() { return image; }
    public String getCategory() { return category; }
    public String[] getSizes() { return sizes; }
    public UUID getCollectionId() { return collectionId; }
    public int getStockQuantity() { return stockQuantity; }
    public int getLowStockThreshold() { return lowStockThreshold; }
    public boolean isTest() { return isTest; }
    public boolean isActive() { return active; }
    public String getOccasion() { return occasion; }
    public String getColor() { return color; }
    public String getMaterial() { return material; }
    public String getSubtitle() { return subtitle; }
    public String getSku() { return sku; }
    public String getImages() { return images; }
    public String getCareInstructions() { return careInstructions; }
    public UUID getModelId() { return modelId; }
    public String getColorKey() { return colorKey; }
    public String getColorHex() { return colorHex; }
    public String getColorNameRu() { return colorNameRu; }
    public String getColorNameEn() { return colorNameEn; }
    public Long getNm() { return nm; }
    public BigDecimal getSalePrice() { return salePrice; }
    public int getSortOrder() { return sortOrder; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    // Setters
    public void setId(String id) { this.id = id; }
    public void setTitle(String title) { this.title = title; }
    public void setDescription(String description) { this.description = description; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public void setImage(String image) { this.image = image; }
    public void setCategory(String category) { this.category = category; }
    public void setSizes(String[] sizes) { this.sizes = sizes; }
    public void setCollectionId(UUID collectionId) { this.collectionId = collectionId; }
    public void setStockQuantity(int stockQuantity) { this.stockQuantity = stockQuantity; }
    public void setLowStockThreshold(int lowStockThreshold) { this.lowStockThreshold = lowStockThreshold; }
    public void setTest(boolean test) { isTest = test; }
    public void setActive(boolean active) { this.active = active; }
    public void setOccasion(String occasion) { this.occasion = occasion; }
    public void setColor(String color) { this.color = color; }
    public void setMaterial(String material) { this.material = material; }
    public void setSubtitle(String subtitle) { this.subtitle = subtitle; }
    public void setSku(String sku) { this.sku = sku; }
    public void setImages(String images) { this.images = images; }
    public void setCareInstructions(String careInstructions) { this.careInstructions = careInstructions; }
    public void setModelId(UUID modelId) { this.modelId = modelId; }
    public void setColorKey(String colorKey) { this.colorKey = colorKey; }
    public void setColorHex(String colorHex) { this.colorHex = colorHex; }
    public void setColorNameRu(String colorNameRu) { this.colorNameRu = colorNameRu; }
    public void setColorNameEn(String colorNameEn) { this.colorNameEn = colorNameEn; }
    public void setNm(Long nm) { this.nm = nm; }
    public void setSalePrice(BigDecimal salePrice) { this.salePrice = salePrice; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
}

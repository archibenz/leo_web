package com.reinasleo.api.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "product_sets")
public class ProductSet {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "`key`", nullable = false, unique = true, length = 64)
    private String key;

    @Column(name = "name_ru", nullable = false, length = 255)
    private String nameRu;

    @Column(name = "name_en", nullable = false, length = 255)
    private String nameEn;

    @Column(name = "desc_ru", nullable = false, columnDefinition = "TEXT")
    private String descRu;

    @Column(name = "desc_en", nullable = false, columnDefinition = "TEXT")
    private String descEn;

    @Column(nullable = false, length = 512)
    private String image;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public ProductSet() {}

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
    public String getKey() { return key; }
    public String getNameRu() { return nameRu; }
    public String getNameEn() { return nameEn; }
    public String getDescRu() { return descRu; }
    public String getDescEn() { return descEn; }
    public String getImage() { return image; }
    public int getSortOrder() { return sortOrder; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setKey(String key) { this.key = key; }
    public void setNameRu(String nameRu) { this.nameRu = nameRu; }
    public void setNameEn(String nameEn) { this.nameEn = nameEn; }
    public void setDescRu(String descRu) { this.descRu = descRu; }
    public void setDescEn(String descEn) { this.descEn = descEn; }
    public void setImage(String image) { this.image = image; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public void setActive(boolean active) { this.active = active; }
}

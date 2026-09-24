package com.reinasleo.api.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "product_models")
public class ProductModel {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "model_key", nullable = false, unique = true)
    private int modelKey;

    @Column(nullable = false, unique = true, length = 128)
    private String slug;

    @Column(name = "name_ru", nullable = false, length = 255)
    private String nameRu;

    @Column(name = "name_en", nullable = false, length = 255)
    private String nameEn;

    @Column(nullable = false, length = 32)
    private String category;

    @Column(name = "desc_ru", nullable = false, columnDefinition = "TEXT")
    private String descRu;

    @Column(name = "desc_en", nullable = false, columnDefinition = "TEXT")
    private String descEn;

    @Column(name = "story_ru", columnDefinition = "TEXT")
    private String storyRu;

    @Column(name = "story_en", columnDefinition = "TEXT")
    private String storyEn;

    @Column(name = "composition_ru", nullable = false, columnDefinition = "TEXT")
    private String compositionRu;

    @Column(name = "composition_en", nullable = false, columnDefinition = "TEXT")
    private String compositionEn;

    @Column(name = "care_ru", nullable = false, columnDefinition = "TEXT")
    private String careRu;

    @Column(name = "care_en", nullable = false, columnDefinition = "TEXT")
    private String careEn;

    @Column(nullable = false, columnDefinition = "TEXT ARRAY")
    private String[] sizes = {"XS", "S", "M", "L", "XL"};

    // Мерки изделия (п. 15) — JSON-массив Measurement; null — мерок нет.
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String measurements;

    @Column(nullable = false, length = 512)
    private String image;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private String gallery = "[]";

    @Column(length = 16)
    private String season;

    // Артикул модели: у «Брюк алладинов» карточка WB заведена на белый цвет, а
    // первым на витрине стоит песочный — сток-снимок и JSON-LD обязаны ссылаться
    // на ту карточку, что была до переезда. NULL = артикул первого варианта.
    @Column
    private Long nm;

    @Column(name = "featured_order")
    private Integer featuredOrder;

    @Column(name = "lookbook_order")
    private Integer lookbookOrder;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(nullable = false)
    private boolean active = true;

    // Неопубликованная правка — перекрытие полей выше. NULL = черновика нет.
    // Публикация переносит поля в колонки и очищает черновик: в draft лежит
    // намерение, в колонках — факт.
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String draft;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public ProductModel() {}

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
    public int getModelKey() { return modelKey; }
    public String getSlug() { return slug; }
    public String getNameRu() { return nameRu; }
    public String getNameEn() { return nameEn; }
    public String getCategory() { return category; }
    public String getDescRu() { return descRu; }
    public String getDescEn() { return descEn; }
    public String getStoryRu() { return storyRu; }
    public String getStoryEn() { return storyEn; }
    public String getCompositionRu() { return compositionRu; }
    public String getCompositionEn() { return compositionEn; }
    public String getCareRu() { return careRu; }
    public String getCareEn() { return careEn; }
    public String[] getSizes() { return sizes; }
    public String getMeasurements() { return measurements; }
    public void setMeasurements(String measurements) { this.measurements = measurements; }
    public String getImage() { return image; }
    public String getGallery() { return gallery; }
    public String getSeason() { return season; }
    public Long getNm() { return nm; }
    public Integer getFeaturedOrder() { return featuredOrder; }
    public Integer getLookbookOrder() { return lookbookOrder; }
    public int getSortOrder() { return sortOrder; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public String getDraft() { return draft; }

    public void setModelKey(int modelKey) { this.modelKey = modelKey; }
    public void setSlug(String slug) { this.slug = slug; }
    public void setNameRu(String nameRu) { this.nameRu = nameRu; }
    public void setNameEn(String nameEn) { this.nameEn = nameEn; }
    public void setCategory(String category) { this.category = category; }
    public void setDescRu(String descRu) { this.descRu = descRu; }
    public void setDescEn(String descEn) { this.descEn = descEn; }
    public void setStoryRu(String storyRu) { this.storyRu = storyRu; }
    public void setStoryEn(String storyEn) { this.storyEn = storyEn; }
    public void setCompositionRu(String compositionRu) { this.compositionRu = compositionRu; }
    public void setCompositionEn(String compositionEn) { this.compositionEn = compositionEn; }
    public void setCareRu(String careRu) { this.careRu = careRu; }
    public void setCareEn(String careEn) { this.careEn = careEn; }
    public void setSizes(String[] sizes) { this.sizes = sizes; }
    public void setImage(String image) { this.image = image; }
    public void setGallery(String gallery) { this.gallery = gallery; }
    public void setSeason(String season) { this.season = season; }
    public void setNm(Long nm) { this.nm = nm; }
    public void setFeaturedOrder(Integer featuredOrder) { this.featuredOrder = featuredOrder; }
    public void setLookbookOrder(Integer lookbookOrder) { this.lookbookOrder = lookbookOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public void setActive(boolean active) { this.active = active; }
    public void setDraft(String draft) { this.draft = draft; }
}

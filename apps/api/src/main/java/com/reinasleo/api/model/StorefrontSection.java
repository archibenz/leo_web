package com.reinasleo.api.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "storefront_sections")
public class StorefrontSection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 64)
    private String slug;

    @Column(nullable = false, length = 32)
    private String layout;

    @Column(nullable = false, length = 16)
    private String status = "active";

    @Column(name = "name_ru", nullable = false, length = 255)
    private String nameRu;

    @Column(name = "name_en", nullable = false, length = 255)
    private String nameEn;

    @Column(name = "eyebrow_ru", length = 255)
    private String eyebrowRu;

    @Column(name = "eyebrow_en", length = 255)
    private String eyebrowEn;

    @Column(name = "headline_ru", columnDefinition = "TEXT")
    private String headlineRu;

    @Column(name = "headline_en", columnDefinition = "TEXT")
    private String headlineEn;

    @Column(name = "body_ru", columnDefinition = "TEXT")
    private String bodyRu;

    @Column(name = "body_en", columnDefinition = "TEXT")
    private String bodyEn;

    @Column(name = "video_url", length = 512)
    private String videoUrl;

    @Column(name = "video_desktop_url", length = 512)
    private String videoDesktopUrl;

    @Column(name = "poster_url", length = 512)
    private String posterUrl;

    @Column(name = "poster_desktop_url", length = 512)
    private String posterDesktopUrl;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    // Строки бегущей строки: [{"ru","en"?,"href"?,"until"?}, ...]. Используется
    // только layout='ticker'; у героя и тизера сетов остаётся пустым массивом.
    // Тот же JdbcTypeCode/columnDefinition, что у draft ниже, — H2 в тестовом
    // профиле не знает JSONB и принимает домен, который под него завели
    // (см. application-test.yml), только если колонка объявлена так же.
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private String items = "[]";

    // Неопубликованная правка — перекрытие полей выше. NULL = черновика нет.
    // Публикация переносит поля в колонки и очищает черновик: в draft лежит
    // намерение, в колонках — факт.
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String draft;

    @Column(name = "archived_at")
    private Instant archivedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public StorefrontSection() {}

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
    public String getSlug() { return slug; }
    public String getLayout() { return layout; }
    public String getStatus() { return status; }
    public String getNameRu() { return nameRu; }
    public String getNameEn() { return nameEn; }
    public String getEyebrowRu() { return eyebrowRu; }
    public String getEyebrowEn() { return eyebrowEn; }
    public String getHeadlineRu() { return headlineRu; }
    public String getHeadlineEn() { return headlineEn; }
    public String getBodyRu() { return bodyRu; }
    public String getBodyEn() { return bodyEn; }
    public String getVideoUrl() { return videoUrl; }
    public String getVideoDesktopUrl() { return videoDesktopUrl; }
    public String getPosterUrl() { return posterUrl; }
    public String getPosterDesktopUrl() { return posterDesktopUrl; }
    public int getSortOrder() { return sortOrder; }
    public Instant getArchivedAt() { return archivedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public String getDraft() { return draft; }
    public String getItems() { return items; }

    public void setSlug(String slug) { this.slug = slug; }
    public void setLayout(String layout) { this.layout = layout; }
    public void setStatus(String status) { this.status = status; }
    public void setNameRu(String nameRu) { this.nameRu = nameRu; }
    public void setNameEn(String nameEn) { this.nameEn = nameEn; }
    public void setEyebrowRu(String eyebrowRu) { this.eyebrowRu = eyebrowRu; }
    public void setEyebrowEn(String eyebrowEn) { this.eyebrowEn = eyebrowEn; }
    public void setHeadlineRu(String headlineRu) { this.headlineRu = headlineRu; }
    public void setHeadlineEn(String headlineEn) { this.headlineEn = headlineEn; }
    public void setBodyRu(String bodyRu) { this.bodyRu = bodyRu; }
    public void setBodyEn(String bodyEn) { this.bodyEn = bodyEn; }
    public void setVideoUrl(String videoUrl) { this.videoUrl = videoUrl; }
    public void setVideoDesktopUrl(String videoDesktopUrl) { this.videoDesktopUrl = videoDesktopUrl; }
    public void setPosterUrl(String posterUrl) { this.posterUrl = posterUrl; }
    public void setPosterDesktopUrl(String posterDesktopUrl) { this.posterDesktopUrl = posterDesktopUrl; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public void setArchivedAt(Instant archivedAt) { this.archivedAt = archivedAt; }
    public void setDraft(String draft) { this.draft = draft; }
    public void setItems(String items) { this.items = items; }
}

package com.reinasleo.api.controller;

import com.reinasleo.api.dto.admin.storefront.StorefrontDraftSummary;
import com.reinasleo.api.dto.admin.storefront.StorefrontModelRequest;
import com.reinasleo.api.dto.admin.storefront.StorefrontSectionRequest;
import com.reinasleo.api.dto.admin.storefront.StorefrontSetRequest;
import com.reinasleo.api.dto.storefront.StorefrontResponse;
import com.reinasleo.api.service.StorefrontService;
import com.reinasleo.api.service.storefront.NextRevalidator;
import com.reinasleo.api.service.storefront.StorefrontAdminService;
import com.reinasleo.api.service.storefront.StorefrontCaches;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Запись витрины. Под `/api/admin/**`, то есть под `hasAuthority("ROLE_ADMIN")`
 * из SecurityConfig — отдельного правила заводить не нужно.
 *
 * PUT кладёт правку в черновик и ничего не меняет для покупателя; POST
 * `/publish` переносит черновик в колонки и сбрасывает оба кэша; DELETE
 * `/draft` отказывается от правки и убирает за ней загруженные файлы.
 */
@RestController
@RequestMapping("/api/admin/storefront")
public class StorefrontAdminController {

    private final StorefrontAdminService admin;
    private final StorefrontService storefront;
    private final StorefrontCaches caches;
    private final NextRevalidator revalidator;

    public StorefrontAdminController(StorefrontAdminService admin, StorefrontService storefront,
                                     StorefrontCaches caches, NextRevalidator revalidator) {
        this.admin = admin;
        this.storefront = storefront;
        this.caches = caches;
        this.revalidator = revalidator;
    }

    // Оба сброса — строго после возврата из транзакционного метода, то есть
    // после коммита. Внутри транзакции они утащили бы докоммитные данные в
    // Caffeine на пять минут и в Next на десять.
    private void afterPublish() {
        caches.drop();
        revalidator.storefrontChanged();
    }

    /** Витрина с наложенным черновиком. Никогда не кэшируется — см. StorefrontService. */
    @GetMapping("/preview")
    public ResponseEntity<StorefrontResponse> preview() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(storefront.getStorefrontDraft());
    }

    /** Что именно уедет на витрину, если нажать «Опубликовать». */
    @GetMapping("/drafts")
    public ResponseEntity<List<StorefrontDraftSummary>> drafts() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(admin.drafts());
    }

    // ------------------------------------------------------------ блоки витрины

    @PutMapping(value = "/sections/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public StorefrontSectionRequest saveSectionDraft(@PathVariable UUID id, @RequestBody String patch) {
        return admin.saveSectionDraft(id, patch);
    }

    @PostMapping("/sections/{id}/publish")
    public StorefrontSectionRequest publishSection(@PathVariable UUID id) {
        StorefrontSectionRequest published = admin.publishSection(id);
        afterPublish();
        return published;
    }

    @DeleteMapping("/sections/{id}/draft")
    public StorefrontSectionRequest discardSectionDraft(@PathVariable UUID id) {
        return admin.discardSectionDraft(id);
    }

    // ------------------------------------------------------------ модели

    /** Карточка модели с наложенным черновиком — то, с чем открывается панель. */
    @GetMapping("/models/{id}")
    public ResponseEntity<StorefrontModelRequest> model(@PathVariable UUID id) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(admin.model(id, true));
    }

    @PutMapping(value = "/models/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public StorefrontModelRequest saveModelDraft(@PathVariable UUID id, @RequestBody String patch) {
        return admin.saveModelDraft(id, patch);
    }

    @PostMapping("/models/{id}/publish")
    public StorefrontModelRequest publishModel(@PathVariable UUID id) {
        StorefrontModelRequest published = admin.publishModel(id);
        afterPublish();
        return published;
    }

    @DeleteMapping("/models/{id}/draft")
    public StorefrontModelRequest discardModelDraft(@PathVariable UUID id) {
        return admin.discardModelDraft(id);
    }

    /**
     * Цена, наличие, цвет и галерея цветового варианта. Правка ложится в
     * черновик его МОДЕЛИ — публикуется карточка целиком, одной кнопкой.
     */
    @PutMapping(value = "/products/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public StorefrontModelRequest saveVariantDraft(@PathVariable String id, @RequestBody String patch) {
        return admin.saveVariantDraft(id, patch);
    }

    // ------------------------------------------------------------ образы

    @PutMapping(value = "/sets/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public StorefrontSetRequest saveSetDraft(@PathVariable UUID id, @RequestBody String patch) {
        return admin.saveSetDraft(id, patch);
    }

    @PostMapping("/sets/{id}/publish")
    public StorefrontSetRequest publishSet(@PathVariable UUID id) {
        StorefrontSetRequest published = admin.publishSet(id);
        afterPublish();
        return published;
    }

    @DeleteMapping("/sets/{id}/draft")
    public StorefrontSetRequest discardSetDraft(@PathVariable UUID id) {
        return admin.discardSetDraft(id);
    }
}

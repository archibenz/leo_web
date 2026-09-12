package com.reinasleo.api.dto.admin.storefront;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

/**
 * Карточка модели целиком, вместе с цветовыми вариантами: владелец правит её
 * одним экраном и публикует одной кнопкой, поэтому вариант приходит и
 * публикуется тем же запросом, что и тексты. Ключ карты — `products.id`.
 */
public record StorefrontModelRequest(
        @NotBlank @Size(max = 255) String nameRu,
        @NotBlank @Size(max = 255) String nameEn,
        @NotBlank @Size(max = 32) String category,
        @NotBlank String descRu,
        @NotBlank String descEn,
        String storyRu,
        String storyEn,
        @NotBlank String compositionRu,
        @NotBlank String compositionEn,
        @NotBlank String careRu,
        @NotBlank String careEn,
        @NotEmpty List<@NotBlank @Size(max = 16) String> sizes,
        @NotBlank @Size(max = 512) @Pattern(regexp = MediaUrl.PATTERN, message = MediaUrl.MESSAGE) String image,
        @NotNull List<@Size(max = 512) @Pattern(regexp = MediaUrl.PATTERN, message = MediaUrl.MESSAGE) String> gallery,
        @Size(max = 16) String season,
        Integer featuredOrder,
        Integer lookbookOrder,
        int sortOrder,
        boolean active,
        @NotNull Map<String, @Valid @NotNull StorefrontVariantRequest> variants
) {}

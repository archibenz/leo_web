package com.reinasleo.api.dto.admin.storefront;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Содержимое медиа-блока витрины — ровно то, что правит редактор. Ни slug, ни
 * layout, ни status сюда не входят: это опознание блока и его жизненный цикл,
 * а не текст, и `layout` вдобавок закрыт CHECK'ом в V29.
 */
public record StorefrontSectionRequest(
        @NotBlank @Size(max = 255) String nameRu,
        @NotBlank @Size(max = 255) String nameEn,
        @Size(max = 255) String eyebrowRu,
        @Size(max = 255) String eyebrowEn,
        String headlineRu,
        String headlineEn,
        String bodyRu,
        String bodyEn,
        @Size(max = 512) @Pattern(regexp = MediaUrl.PATTERN, message = MediaUrl.MESSAGE) String videoUrl,
        @Size(max = 512) @Pattern(regexp = MediaUrl.PATTERN, message = MediaUrl.MESSAGE) String videoDesktopUrl,
        @Size(max = 512) @Pattern(regexp = MediaUrl.PATTERN, message = MediaUrl.MESSAGE) String posterUrl,
        @Size(max = 512) @Pattern(regexp = MediaUrl.PATTERN, message = MediaUrl.MESSAGE) String posterDesktopUrl,
        int sortOrder
) {}

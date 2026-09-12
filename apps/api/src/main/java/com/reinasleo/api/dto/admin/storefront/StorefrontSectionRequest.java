package com.reinasleo.api.dto.admin.storefront;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Содержимое медиа-блока витрины — ровно то, что правит редактор. Ни slug, ни
 * layout, ни status сюда не входят: это опознание блока и его жизненный цикл,
 * а не текст, и `layout` вдобавок закрыт CHECK'ом в V29.
 *
 * `items` — строки бегущей строки (layout='ticker' у ровно одного блока);
 * у героя и тизера сетов список всегда пуст. Отдельного поля-переключателя нет
 * по той же причине, по которой его нет у video/poster: содержит их только
 * тот layout, которому они нужны, а не «все возможные поля сразу».
 * `@Valid` обязателен — без него вложенные @NotBlank/@Size/@Pattern у
 * TickerItemRequest тихо не проверяются, и опечатка в ссылке доедет до базы.
 * Максимум 20 строк: поле, в которое можно вписать роман, однажды им и станет.
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
        int sortOrder,
        @NotNull @Size(max = 20) List<@Valid TickerItemRequest> items
) {}

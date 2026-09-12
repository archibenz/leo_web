package com.reinasleo.api.dto.admin.storefront;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Одна строка бегущей строки. `ru` обязателен — без него нечего показывать ни
 * одному покупателю; `en` необязателен, и его отсутствие означает «на
 * английской странице эта строка не показывается», а не «покажем русский».
 *
 * `href` — только свой адрес. Схема (`https://`), протокол-относительный
 * (`//чужой-хост`) и выход вверх по дереву (`..`) отклоняются на входе: строка
 * ведёт по нашему сайту, а не наружу. Своя проверка, а не переиспользование
 * MediaUrl: тот регэксп размечен для путей к файлам и пропускает `//хост`
 * (двойной слэш — разрешённый в его классе символ), что для media-ссылки
 * почти безопасно (браузер не уходит по img/video src со страницы), а для
 * кликабельного href было бы открытым редиректом.
 *
 * `until` — `YYYY-MM-DD` строкой, не LocalDate: StorefrontDraftMerge гоняет
 * черновик через самодельный ObjectMapper без JavaTimeModule, и дата-тип
 * уронил бы слияние секции целиком, не только тикера.
 */
public record TickerItemRequest(
        @NotBlank @Size(max = 160) String ru,
        @Size(max = 160) String en,
        @Pattern(regexp = "^/(?!/)(?!.*\\.\\.)\\S*$", message = "href must be a local /path, not an external address") String href,
        @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$", message = "until must be YYYY-MM-DD") String until
) {}

package com.reinasleo.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.UUID;

// user_id намеренно отсутствует: сервер сам решает его по
// @AuthenticationPrincipal (cookie/Authorization), клиент его никогда не
// присылает — иначе ручка без авторизации позволила бы приписать событие
// чужому аккаунту.
public record SiteEventRequest(
        @NotBlank(message = "Event type is required")
        @Pattern(regexp = SiteEventTypes.EVENT_TYPE_PATTERN, message = "Unknown event type")
        String eventType,

        @Size(max = 64, message = "Session key too long")
        @Pattern(regexp = "^[A-Za-z0-9_-]{1,64}$", message = "Session key has an invalid format")
        String sessionKey,

        @Size(max = 128, message = "Product id too long")
        String productId,

        UUID modelId,

        @Size(max = 256, message = "Path too long")
        @Pattern(regexp = "^/.*$", message = "Path must be absolute")
        String path,

        @Size(max = 8, message = "Locale too long")
        @Pattern(regexp = "^[a-z]{2}(-[A-Z]{2})?$", message = "Locale has an invalid format")
        String locale,

        @Pattern(regexp = "^(phone|desktop)$", message = "Unknown device class")
        String device,

        @Pattern(regexp = "^(wildberries|ozon)$", message = "Unknown marketplace")
        String marketplace
) {}

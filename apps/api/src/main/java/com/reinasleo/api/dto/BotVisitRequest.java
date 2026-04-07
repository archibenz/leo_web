package com.reinasleo.api.dto;

import jakarta.validation.constraints.NotNull;

public record BotVisitRequest(
        @NotNull Long telegramId,
        String username,
        String firstName,
        String lastName,
        String languageCode,
        String source
) {}

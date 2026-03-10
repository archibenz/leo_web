package com.reinasleo.api.dto;

import jakarta.validation.constraints.NotNull;

public record BotLoginRequest(
        @NotNull Long telegramId,
        @NotNull String authToken
) {}

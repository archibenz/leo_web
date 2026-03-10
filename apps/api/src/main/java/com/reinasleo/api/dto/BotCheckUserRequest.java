package com.reinasleo.api.dto;

import jakarta.validation.constraints.NotNull;

public record BotCheckUserRequest(
        @NotNull Long telegramId
) {}

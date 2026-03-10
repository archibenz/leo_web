package com.reinasleo.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record BotRegisterRequest(
        @NotNull Long telegramId,
        @NotBlank String phone,
        @NotBlank String firstName,
        String surname,
        @NotNull String authToken
) {}

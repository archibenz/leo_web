package com.reinasleo.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record BotOrganicRegisterRequest(
        @NotNull Long telegramId,
        @NotBlank String phone,
        @NotBlank String firstName,
        String surname
) {}

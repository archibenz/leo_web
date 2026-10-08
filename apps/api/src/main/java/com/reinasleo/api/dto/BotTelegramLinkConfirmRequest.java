package com.reinasleo.api.dto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.reinasleo.api.util.StrictTelegramIdDeserializer;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

public record BotTelegramLinkConfirmRequest(
        @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{43}") String challengeToken,
        @NotNull @Positive @JsonDeserialize(using = StrictTelegramIdDeserializer.class) Long telegramId,
        @Pattern(regexp = "[A-Za-z0-9_]{1,32}") String telegramUsername) {}

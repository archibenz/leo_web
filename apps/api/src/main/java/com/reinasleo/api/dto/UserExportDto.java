package com.reinasleo.api.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record UserExportDto(
        UUID id,
        String email,
        String name,
        String surname,
        String phone,
        LocalDate dateOfBirth,
        Long telegramId,
        boolean newsletter,
        boolean newsletterPromos,
        boolean newsletterCollections,
        boolean newsletterProjects,
        boolean privacyAccepted,
        String role,
        Instant createdAt,
        Instant updatedAt,
        boolean hasPassword,
        boolean hasTelegram
) {}

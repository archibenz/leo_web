package com.reinasleo.api.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        String name,
        String surname,
        LocalDate dateOfBirth,
        Instant createdAt,
        String role,
        boolean newsletterPromos,
        boolean newsletterCollections,
        boolean newsletterProjects
) {}

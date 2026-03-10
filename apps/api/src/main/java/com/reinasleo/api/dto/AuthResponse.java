package com.reinasleo.api.dto;

import java.time.Instant;
import java.util.UUID;

public record AuthResponse(
        UUID id,
        String email,
        String name,
        String surname,
        Instant createdAt
) {}

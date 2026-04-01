package com.reinasleo.api.dto;

import java.time.Instant;
import java.util.UUID;

public record CareGuideResponse(
        UUID id,
        String title,
        String description,
        String tips,
        String image,
        String careSymbols,
        int sortOrder,
        boolean active,
        Instant createdAt
) {}

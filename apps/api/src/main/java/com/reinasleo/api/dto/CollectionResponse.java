package com.reinasleo.api.dto;

import java.time.Instant;
import java.util.UUID;

public record CollectionResponse(
        UUID id,
        String name,
        String slug,
        String description,
        String imageUrl,
        boolean active,
        int sortOrder,
        long productCount,
        Instant createdAt
) {}

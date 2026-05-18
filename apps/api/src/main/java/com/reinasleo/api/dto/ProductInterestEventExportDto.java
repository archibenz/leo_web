package com.reinasleo.api.dto;

import java.time.Instant;

public record ProductInterestEventExportDto(
        String productId,
        String productTitle,
        String eventType,
        Instant createdAt
) {}

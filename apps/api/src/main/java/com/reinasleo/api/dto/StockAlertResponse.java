package com.reinasleo.api.dto;

import java.time.Instant;
import java.util.UUID;

public record StockAlertResponse(
        UUID id,
        String productId,
        String productTitle,
        String alertType,
        int currentStock,
        Instant createdAt
) {}

package com.reinasleo.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record RecentOrderResponse(
        UUID id,
        String customerName,
        String customerEmail,
        String status,
        BigDecimal total,
        int itemsCount,
        Instant createdAt
) {}

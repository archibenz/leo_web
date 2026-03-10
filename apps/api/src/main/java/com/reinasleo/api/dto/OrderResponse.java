package com.reinasleo.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OrderResponse(
        UUID id,
        String status,
        BigDecimal total,
        List<OrderItemResponse> items,
        Instant createdAt
) {}

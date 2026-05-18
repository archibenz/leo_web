package com.reinasleo.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OrderExportDto(
        UUID id,
        String status,
        BigDecimal total,
        List<OrderItemExportDto> items,
        Instant createdAt,
        Instant updatedAt
) {}

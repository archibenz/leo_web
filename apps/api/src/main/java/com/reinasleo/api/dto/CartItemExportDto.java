package com.reinasleo.api.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record CartItemExportDto(
        String productId,
        String productTitle,
        BigDecimal productPrice,
        String size,
        int quantity,
        Instant addedAt
) {}

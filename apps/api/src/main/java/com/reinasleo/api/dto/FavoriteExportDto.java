package com.reinasleo.api.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record FavoriteExportDto(
        String productId,
        String productTitle,
        BigDecimal productPrice,
        Instant addedAt
) {}

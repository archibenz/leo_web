package com.reinasleo.api.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record FavoriteResponse(
        String productId,
        String productTitle,
        BigDecimal productPrice,
        String productImage,
        Instant addedAt
) {}

package com.reinasleo.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record CartItemResponse(
        UUID id,
        String productId,
        String productTitle,
        BigDecimal productPrice,
        String productImage,
        String size,
        int quantity
) {}

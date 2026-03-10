package com.reinasleo.api.dto;

import java.math.BigDecimal;

public record OrderItemResponse(
        String productId,
        String productTitle,
        String size,
        int quantity,
        BigDecimal price
) {}

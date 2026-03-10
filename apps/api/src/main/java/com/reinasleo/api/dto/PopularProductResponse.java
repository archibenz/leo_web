package com.reinasleo.api.dto;

public record PopularProductResponse(
        String productId,
        String productTitle,
        long eventCount
) {}

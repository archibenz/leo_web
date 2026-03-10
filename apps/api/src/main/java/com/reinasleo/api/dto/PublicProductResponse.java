package com.reinasleo.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record PublicProductResponse(
        String id,
        String title,
        String subtitle,
        BigDecimal price,
        String image,
        String category,
        String[] sizes,
        boolean isTest,
        String occasion,
        String color,
        String material,
        String images,
        UUID collectionId,
        String collectionName,
        boolean inStock
) {}

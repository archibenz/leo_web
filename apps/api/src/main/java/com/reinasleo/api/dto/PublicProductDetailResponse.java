package com.reinasleo.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record PublicProductDetailResponse(
        String id,
        String title,
        String subtitle,
        String description,
        BigDecimal price,
        String image,
        String category,
        String[] sizes,
        boolean isTest,
        String occasion,
        String color,
        String material,
        String sku,
        String images,
        UUID collectionId,
        String collectionName,
        boolean inStock,
        String careInstructions
) {}

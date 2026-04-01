package com.reinasleo.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AdminProductResponse(
        String id,
        String title,
        String description,
        BigDecimal price,
        String image,
        String category,
        String[] sizes,
        UUID collectionId,
        String collectionName,
        int stockQuantity,
        int lowStockThreshold,
        boolean isTest,
        boolean active,
        String occasion,
        String color,
        String material,
        String subtitle,
        String sku,
        String images,
        String careInstructions,
        Instant createdAt,
        Instant updatedAt
) {}

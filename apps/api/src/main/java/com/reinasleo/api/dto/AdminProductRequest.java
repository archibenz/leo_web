package com.reinasleo.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record AdminProductRequest(
        String id,
        String title,
        String description,
        BigDecimal price,
        String category,
        String[] sizes,
        UUID collectionId,
        int stockQuantity,
        int lowStockThreshold,
        String occasion,
        String color,
        String material,
        String subtitle,
        String sku,
        String images,
        boolean active,
        String careInstructions
) {}

package com.reinasleo.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record AdminProductRequest(
        String id,
        @NotBlank String title,
        String description,
        @NotNull @DecimalMin("0.01") BigDecimal price,
        @NotBlank String category,
        String[] sizes,
        UUID collectionId,
        @Min(0) int stockQuantity,
        @Min(0) int lowStockThreshold,
        String occasion,
        String color,
        String material,
        String subtitle,
        String sku,
        String images,
        boolean active,
        String careInstructions
) {}

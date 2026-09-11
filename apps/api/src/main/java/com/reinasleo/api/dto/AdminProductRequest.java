package com.reinasleo.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.util.UUID;

public record AdminProductRequest(
        String id,
        @NotBlank String title,
        String description,
        // Цена необязательна: товар без цены — предзаказ (V29 сделала колонку
        // nullable, шесть строк каталога сейчас без цены). @DecimalMin на null
        // не срабатывает, поэтому ноль и отрицательная цена по-прежнему отказ.
        @DecimalMin("0.01") BigDecimal price,
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

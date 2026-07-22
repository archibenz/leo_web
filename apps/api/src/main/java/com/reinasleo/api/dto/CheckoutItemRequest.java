package com.reinasleo.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CheckoutItemRequest(
        @NotBlank(message = "Product id is required")
        @Size(max = 128, message = "Product id too long")
        String productId,

        @Size(max = 16, message = "Size too long")
        String size,

        @Min(value = 1, message = "Quantity must be at least 1")
        @Max(value = 100, message = "Quantity too large")
        int qty
) { }

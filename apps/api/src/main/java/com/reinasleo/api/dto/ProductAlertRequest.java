package com.reinasleo.api.dto;

import jakarta.validation.constraints.NotBlank;

public record ProductAlertRequest(
        @NotBlank(message = "Product ID is required")
        String productId
) {}

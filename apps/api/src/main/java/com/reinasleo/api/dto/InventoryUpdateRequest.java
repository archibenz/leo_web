package com.reinasleo.api.dto;

import jakarta.validation.constraints.Min;

public record InventoryUpdateRequest(
        @Min(0) int quantity
) {}

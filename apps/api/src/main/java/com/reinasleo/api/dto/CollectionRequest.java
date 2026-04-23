package com.reinasleo.api.dto;

import jakarta.validation.constraints.NotBlank;

public record CollectionRequest(
        @NotBlank String name,
        String description,
        String imageUrl,
        Integer sortOrder
) {}

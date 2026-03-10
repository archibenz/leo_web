package com.reinasleo.api.dto;

public record CollectionRequest(
        String name,
        String description,
        String imageUrl,
        Integer sortOrder
) {}

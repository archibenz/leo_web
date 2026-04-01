package com.reinasleo.api.dto;

public record CareGuideRequest(
        String title,
        String description,
        String tips,
        String image,
        String careSymbols,
        Integer sortOrder,
        Boolean active
) {}

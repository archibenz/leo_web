package com.reinasleo.api.dto;

import jakarta.validation.constraints.NotBlank;

public record CareGuideRequest(
        @NotBlank String title,
        String description,
        String tips,
        String image,
        String careSymbols,
        Integer sortOrder,
        Boolean active
) {}

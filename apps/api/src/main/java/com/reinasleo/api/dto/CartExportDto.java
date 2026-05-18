package com.reinasleo.api.dto;

import java.time.Instant;
import java.util.List;

public record CartExportDto(
        List<CartItemExportDto> items,
        Instant createdAt,
        Instant updatedAt
) {}

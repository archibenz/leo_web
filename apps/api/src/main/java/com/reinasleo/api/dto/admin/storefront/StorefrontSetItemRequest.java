package com.reinasleo.api.dto.admin.storefront;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Позиция образа — конкретный цветовой вариант, надетый в нём. */
public record StorefrontSetItemRequest(
        @NotBlank @Size(max = 128) String productId,
        @Min(0) int position
) {}

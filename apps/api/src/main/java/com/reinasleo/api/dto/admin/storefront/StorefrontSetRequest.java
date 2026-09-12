package com.reinasleo.api.dto.admin.storefront;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Образ вместе с составом: состав — массив внутри самого образа, не отдельная правка. */
public record StorefrontSetRequest(
        @NotBlank @Size(max = 255) String nameRu,
        @NotBlank @Size(max = 255) String nameEn,
        @NotBlank String descRu,
        @NotBlank String descEn,
        @NotBlank @Size(max = 512) @Pattern(regexp = MediaUrl.PATTERN, message = MediaUrl.MESSAGE) String image,
        int sortOrder,
        boolean active,
        @NotNull List<@Valid @NotNull StorefrontSetItemRequest> items
) {}

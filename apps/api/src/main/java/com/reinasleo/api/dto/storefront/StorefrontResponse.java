package com.reinasleo.api.dto.storefront;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record StorefrontResponse(List<StorefrontProduct> products, List<StorefrontSet> sets,
                                 List<StorefrontSectionDto> sections) {}

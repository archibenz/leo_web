package com.reinasleo.api.dto.storefront;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record StorefrontColour(String id, String key, String hex, String en, String ru, Long nm,
                               BigDecimal price, BigDecimal sale, String image, List<String> gallery) {}

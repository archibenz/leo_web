package com.reinasleo.api.dto.storefront;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record StorefrontSetItem(String productId, int productKey, String colourKey) {}

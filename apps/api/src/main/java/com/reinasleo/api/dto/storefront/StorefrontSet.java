package com.reinasleo.api.dto.storefront;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record StorefrontSet(String key, String en, String ru, String descEn, String descRu, String image,
                            List<StorefrontSetItem> items) {}

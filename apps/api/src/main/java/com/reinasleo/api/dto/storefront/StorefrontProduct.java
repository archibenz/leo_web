package com.reinasleo.api.dto.storefront;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record StorefrontProduct(String id, int key, String slug, String en, String ru, String cat,
                                BigDecimal price, BigDecimal sale,
                                String descEn, String descRu, String storyEn, String storyRu,
                                String compositionEn, String compositionRu, String careEn, String careRu,
                                List<StorefrontColour> colors, List<String> sizes, String image, List<String> gallery,
                                Long nm, String season, Integer featuredOrder, Integer lookbookOrder,
                                List<Measurement> measurements) {}

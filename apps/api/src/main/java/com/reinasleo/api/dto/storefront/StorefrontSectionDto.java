package com.reinasleo.api.dto.storefront;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record StorefrontSectionDto(String id, String slug, String layout, String status,
                                   String nameRu, String nameEn, String eyebrowRu, String eyebrowEn,
                                   String headlineRu, String headlineEn, String bodyRu, String bodyEn,
                                   String videoUrl, String videoDesktopUrl, String posterUrl, String posterDesktopUrl,
                                   int sortOrder) {}

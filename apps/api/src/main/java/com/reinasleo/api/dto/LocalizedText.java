package com.reinasleo.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Правка одного текста сайта, русский и английский парой. null — «как было». */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record LocalizedText(String ru, String en) {}

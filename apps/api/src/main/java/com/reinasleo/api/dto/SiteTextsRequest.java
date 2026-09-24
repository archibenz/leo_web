package com.reinasleo.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Map;

/** Все правки «Текстов сайта» разом: форма отправляет их целиком. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SiteTextsRequest(Map<String, LocalizedText> texts, String contactEmail) {}

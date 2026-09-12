package com.reinasleo.api.dto.admin.storefront;

import java.util.List;

/**
 * Что именно уедет на витрину, если нажать «Опубликовать». Кнопка без этого
 * списка — это кнопка «сделай что-то, я не помню что».
 *
 * kind: section | model | set; key — slug или ключ строки; fields — точечные
 * пути правки (`headlineRu`, `variants.wb-1.price`).
 */
public record StorefrontDraftSummary(String kind, String id, String key, List<String> fields) {}

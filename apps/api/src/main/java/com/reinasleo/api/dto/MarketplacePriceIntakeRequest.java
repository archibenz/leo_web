package com.reinasleo.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

// Пачка целиком или ничего: превышение лимита отбивает 400 весь запрос
// (тот же приём, что в SiteEventBatchRequest) — у нас 87 строк сегодня, 500
// это запас на рост, а не ожидаемый размер.
public record MarketplacePriceIntakeRequest(
        @NotEmpty(message = "items list must not be empty")
        @Size(max = 500, message = "batch must not exceed 500 items")
        List<@Valid MarketplacePriceItemRequest> items
) {}

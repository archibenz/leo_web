package com.reinasleo.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

// Пачка целиком или ничего: превышение лимита отбивает 400 весь запрос, а не
// первые 20 событий — частичный приём означал бы молчаливую потерю хвоста.
public record SiteEventBatchRequest(
        @NotEmpty(message = "Events list must not be empty")
        @Size(max = 20, message = "Too many events in one batch")
        List<@Valid SiteEventRequest> events
) {}

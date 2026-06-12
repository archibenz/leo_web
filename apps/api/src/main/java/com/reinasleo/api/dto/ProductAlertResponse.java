package com.reinasleo.api.dto;

public record ProductAlertResponse(
        String productId,
        boolean subscribed,
        boolean telegramLinked
) {}

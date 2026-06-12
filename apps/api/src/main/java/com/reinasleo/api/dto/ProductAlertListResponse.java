package com.reinasleo.api.dto;

import java.util.List;

public record ProductAlertListResponse(
        List<String> productIds,
        boolean telegramLinked
) {}

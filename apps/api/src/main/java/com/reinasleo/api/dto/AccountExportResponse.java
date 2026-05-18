package com.reinasleo.api.dto;

import java.time.Instant;
import java.util.List;

public record AccountExportResponse(
        UserExportDto user,
        List<OrderExportDto> orders,
        CartExportDto cart,
        List<FavoriteExportDto> favorites,
        List<ProductInterestEventExportDto> productInterestEvents,
        long verificationCodesIssued,
        Instant exportedAt
) {}

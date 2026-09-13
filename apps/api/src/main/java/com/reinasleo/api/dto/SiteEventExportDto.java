package com.reinasleo.api.dto;

import java.time.Instant;

// Sparser than ProductInterestEventExportDto by design: site_events is a
// general behaviour log (page views included), not a curated product-interest
// list, so it is not worth an extra join for a product title here.
public record SiteEventExportDto(
        String eventType,
        Instant occurredAt,
        String productId,
        String path,
        String marketplace
) {}

package com.reinasleo.api.dto;

import java.util.List;
import java.util.Map;

public record HomepageResponse(
        List<PublicProductResponse> featuredProducts,
        List<CollectionResponse> collections,
        Map<String, Object> season
) {}

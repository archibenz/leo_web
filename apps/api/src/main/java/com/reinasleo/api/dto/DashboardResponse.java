package com.reinasleo.api.dto;

public record DashboardResponse(
        long totalProducts,
        long totalCollections,
        long lowStockCount,
        long outOfStockCount,
        long totalAlerts
) {}

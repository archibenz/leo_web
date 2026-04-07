package com.reinasleo.api.dto;

import java.math.BigDecimal;

public record DashboardResponse(
        long totalProducts,
        long totalCollections,
        long lowStockCount,
        long outOfStockCount,
        long totalAlerts,
        long totalUsers,
        long totalOrders,
        BigDecimal totalRevenue,
        long newUsers7d,
        long newOrders7d,
        BigDecimal revenue7d
) {}

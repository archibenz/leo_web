package com.reinasleo.api.dto;

import java.time.LocalDate;
import java.util.Map;

/**
 * Сутки витрины, посчитанные по Москве. Разрезы отдаются картами, а не
 * колонками: набор устройств и площадок меняется без правки формата.
 */
public record SiteDayPoint(
        LocalDate date,
        long pageViews,
        long sessions,
        long productViews,
        long marketplaceClicks,
        long addToCart,
        long addToFavourite,
        long signups,
        Map<String, Long> byDevice,
        Map<String, Long> byLocale,
        Map<String, Long> byMarketplace
) {}

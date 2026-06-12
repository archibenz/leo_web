package com.reinasleo.api.event;

/**
 * Publish'ится из AdminProductService после commit'а, когда stock товара
 * переходит 0 → >0. Слушается ProductStockAlertService(AFTER_COMMIT) для
 * рассылки «снова в наличии» подписанным пользователям.
 */
public record BackInStockEvent(String productId, String productTitle) {}

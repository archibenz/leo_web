package com.reinasleo.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Конфиг YooKassa checkout. enabled=false (дефолт) — фича выключена: POST
 * /api/checkout отвечает 503, приложение стартует без YooKassa credentials.
 * При enabled=true отсутствующие credentials валят старт (fail-fast вместо
 * первой упавшей оплаты в проде).
 */
@ConfigurationProperties(prefix = "yookassa")
public record YooKassaProperties(String shopId, String secretKey, boolean enabled, String returnUrlBase) {

    public YooKassaProperties {
        if (enabled) {
            if (shopId == null || shopId.isBlank()) {
                throw new IllegalStateException(
                        "YOOKASSA_SHOP_ID is required when CHECKOUT_ENABLED=true; refusing to start");
            }
            if (secretKey == null || secretKey.isBlank()) {
                throw new IllegalStateException(
                        "YOOKASSA_SECRET_KEY is required when CHECKOUT_ENABLED=true; refusing to start");
            }
        }
        if (returnUrlBase == null || returnUrlBase.isBlank()) {
            returnUrlBase = "https://reinasleo.com";
        }
    }
}

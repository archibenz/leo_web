package com.reinasleo.api.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Map;

/**
 * Payment object от YooKassa (create response и GET /payments/{id}).
 * captured_at оставлен String — парсится защищённо в webhook-сервисе,
 * чтобы неожиданный формат провайдера не валил обработку.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record YooKassaPaymentResponse(
        String id,
        String status,
        boolean paid,
        YooKassaAmount amount,
        YooKassaConfirmationResponse confirmation,
        @JsonProperty("captured_at") String capturedAt,
        Map<String, String> metadata
) { }

package com.reinasleo.api.controller;

import com.reinasleo.api.service.PaymentWebhookService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Приём webhook'ов YooKassa. Тело используется ТОЛЬКО чтобы узнать payment id
 * — фактический статус PaymentWebhookService перечитывает у провайдера
 * (verify-by-fetch), поэтому подписи/секрета на route нет и не нужно.
 *
 * 200 — обработано или проигнорировано (idempotent/unknown), 400 — мусорное
 * тело, 5xx — транзиентная ошибка (YooKassa повторит доставку).
 */
@RestController
@RequestMapping("/api/payments/yookassa/webhook")
public class YooKassaWebhookController {

    private static final int MAX_PAYMENT_ID_LENGTH = 255;

    private final PaymentWebhookService webhookService;

    public YooKassaWebhookController(PaymentWebhookService webhookService) {
        this.webhookService = webhookService;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> handle(@RequestBody Map<String, Object> body) {
        String event = body.get("event") instanceof String s && !s.isBlank() ? s : null;
        String paymentId = null;
        if (body.get("object") instanceof Map<?, ?> object
                && object.get("id") instanceof String id
                && !id.isBlank()
                && id.length() <= MAX_PAYMENT_ID_LENGTH) {
            paymentId = id;
        }
        if (event == null || paymentId == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Malformed webhook payload",
                    "error", "malformed_webhook"
            ));
        }

        webhookService.process(event, paymentId);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}

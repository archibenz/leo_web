package com.reinasleo.api.service;

import com.reinasleo.api.client.YooKassaApiException;
import com.reinasleo.api.client.YooKassaClient;
import com.reinasleo.api.client.YooKassaPaymentResponse;
import com.reinasleo.api.exception.IllegalStateTransitionException;
import com.reinasleo.api.model.Order;
import com.reinasleo.api.model.OrderState;
import com.reinasleo.api.model.Payment;
import com.reinasleo.api.model.PaymentEvent;
import com.reinasleo.api.repository.OrderRepository;
import com.reinasleo.api.repository.PaymentEventRepository;
import com.reinasleo.api.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Map;
import java.util.Set;

/**
 * Обработка YooKassa webhook'ов. Телу webhook'а НЕ доверяем: статус всегда
 * перечитывается через GET /payments/{id} и применяется только verified
 * значение — спуфинг тела (нет подписи у YooKassa webhook'ов) бесполезен.
 *
 * Идемпотентность: synthetic external_event_id = "<paymentId>:<verifiedStatus>"
 * (у YooKassa notification нет собственного id) + UNIQUE(provider,
 * external_event_id) в payment_events. Повторная доставка того же события —
 * no-op с ack 200.
 *
 * raw_payload хранит только event/objectId/verifiedStatus — data minimization
 * 152-ФЗ Art.5(7), карточные данные и PII плательщика не сохраняются.
 */
@Service
public class PaymentWebhookService {

    private static final Logger log = LoggerFactory.getLogger(PaymentWebhookService.class);

    private static final String PROVIDER = "YOOKASSA";
    private static final Set<String> KNOWN_STATUSES =
            Set.of("pending", "waiting_for_capture", "succeeded", "canceled");
    private static final Set<String> TERMINAL_PAYMENT_STATUSES =
            Set.of("succeeded", "canceled", "refunded", "failed");

    private final YooKassaClient yooKassaClient;
    private final PaymentRepository paymentRepository;
    private final PaymentEventRepository paymentEventRepository;
    private final OrderRepository orderRepository;
    private final OrderStateService orderStateService;

    public PaymentWebhookService(YooKassaClient yooKassaClient,
                                 PaymentRepository paymentRepository,
                                 PaymentEventRepository paymentEventRepository,
                                 OrderRepository orderRepository,
                                 OrderStateService orderStateService) {
        this.yooKassaClient = yooKassaClient;
        this.paymentRepository = paymentRepository;
        this.paymentEventRepository = paymentEventRepository;
        this.orderRepository = orderRepository;
        this.orderStateService = orderStateService;
    }

    /**
     * Нормальное завершение = ack 200. Транспортная ошибка verify-запроса
     * пробрасывается (→ 502) — YooKassa повторит доставку позже.
     */
    @Transactional
    public void process(String claimedEvent, String externalPaymentId) {
        YooKassaPaymentResponse verified;
        try {
            verified = yooKassaClient.getPayment(externalPaymentId);
        } catch (YooKassaApiException e) {
            if (e.isNotFound()) {
                // Провайдер такого платежа не знает — спуфнутое тело. Ack, лог.
                log.warn("Webhook for payment {} unknown to YooKassa (claimed event {}); ignoring",
                        externalPaymentId, claimedEvent);
                return;
            }
            throw e;
        }

        String status = verified.status();
        if (status == null || !KNOWN_STATUSES.contains(status)) {
            log.warn("Webhook for payment {}: unexpected verified status {}; ignoring", externalPaymentId, status);
            return;
        }

        String externalEventId = externalPaymentId + ":" + status;
        if (paymentEventRepository.findByProviderAndExternalEventId(PROVIDER, externalEventId).isPresent()) {
            log.info("Webhook event {} already processed; ack", externalEventId);
            return;
        }

        Payment payment = paymentRepository
                .findByProviderAndExternalPaymentId(PROVIDER, externalPaymentId)
                .orElse(null);
        if (payment == null) {
            // Verified платёж есть у провайдера, но локальной строки нет
            // (создан вне нашей системы?) — ack + лог, ручная сверка.
            log.error("Webhook for payment {} verified as {} but no local payment row exists; ack",
                    externalPaymentId, status);
            return;
        }

        paymentEventRepository.save(new PaymentEvent(
                PROVIDER, externalEventId, "payment." + status, payment,
                Map.of("event", claimedEvent == null ? "" : claimedEvent,
                       "objectId", externalPaymentId,
                       "verifiedStatus", status)));

        Order order = payment.getOrder();
        switch (status) {
            case "succeeded" -> {
                payment.setStatus("succeeded");
                payment.setCapturedAt(parseInstant(verified.capturedAt()));
                order.setPaymentStatus("succeeded");
                transitionSafely(order, OrderState.PAID, externalPaymentId);
            }
            case "canceled" -> {
                payment.setStatus("canceled");
                order.setPaymentStatus("canceled");
                transitionSafely(order, OrderState.PAYMENT_FAILED, externalPaymentId);
            }
            default -> {
                // pending / waiting_for_capture: терминальный локальный статус
                // не даунгрейдим (защита от гонки со stale verify-ответом).
                if (!TERMINAL_PAYMENT_STATUSES.contains(payment.getStatus())) {
                    payment.setStatus(status);
                    order.setPaymentStatus(status);
                }
            }
        }
        paymentRepository.save(payment);
        orderRepository.save(order);
        log.info("Webhook processed: payment {} -> {}", externalPaymentId, status);
    }

    private void transitionSafely(Order order, OrderState target, String externalPaymentId) {
        try {
            orderStateService.transition(order, target);
        } catch (IllegalStateTransitionException e) {
            // Платёж применён, но заказ уже в несовместимом состоянии (например,
            // отменён админом до оплаты). Событие записано — ack + громкий лог
            // для ручной сверки; retry со стороны YooKassa тут не поможет.
            log.error("Webhook for payment {}: order {} cannot transition {} -> {}; manual reconciliation needed",
                    externalPaymentId, order.getId(), e.getFromState(), e.getToState());
        }
    }

    private static Instant parseInstant(String value) {
        if (value == null || value.isBlank()) {
            return Instant.now();
        }
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException e) {
            log.warn("Unparseable captured_at from YooKassa: {}; using now()", value);
            return Instant.now();
        }
    }
}

package com.reinasleo.api.service;

import com.reinasleo.api.client.YooKassaAmount;
import com.reinasleo.api.client.YooKassaApiException;
import com.reinasleo.api.client.YooKassaClient;
import com.reinasleo.api.client.YooKassaPaymentResponse;
import com.reinasleo.api.exception.IllegalStateTransitionException;
import com.reinasleo.api.model.Order;
import com.reinasleo.api.model.OrderState;
import com.reinasleo.api.model.Payment;
import com.reinasleo.api.model.PaymentEvent;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.OrderRepository;
import com.reinasleo.api.repository.PaymentEventRepository;
import com.reinasleo.api.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentWebhookServiceTest {

    private static final String PAYMENT_ID = "yk-1";

    @Mock private YooKassaClient yooKassaClient;
    @Mock private PaymentRepository paymentRepository;
    @Mock private PaymentEventRepository paymentEventRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private OrderStateService orderStateService;

    private PaymentWebhookService service;
    private Order order;
    private Payment payment;

    @BeforeEach
    void setUp() {
        service = new PaymentWebhookService(yooKassaClient, paymentRepository,
                paymentEventRepository, orderRepository, orderStateService);

        User user = new User("buyer@example.com", "Anna", null, "hash", null, false, true);
        order = new Order(user, new BigDecimal("5000.00"));
        order.setStatus("awaiting_payment");
        payment = new Payment(order, "YOOKASSA", PAYMENT_ID, new BigDecimal("5000.00"), "pending");

        lenient().when(paymentRepository.findByProviderAndExternalPaymentId("YOOKASSA", PAYMENT_ID))
                .thenReturn(Optional.of(payment));
        lenient().when(paymentEventRepository.findByProviderAndExternalEventId(any(), any()))
                .thenReturn(Optional.empty());
    }

    private static YooKassaPaymentResponse verified(String status, String capturedAt) {
        return new YooKassaPaymentResponse(PAYMENT_ID, status, "succeeded".equals(status),
                new YooKassaAmount("5000.00", "RUB"), null, capturedAt, Map.of());
    }

    // ----- payment.succeeded -----

    @Test
    void process_verifiedSucceeded_marksPaymentAndTransitionsToPaid() {
        when(yooKassaClient.getPayment(PAYMENT_ID))
                .thenReturn(verified("succeeded", "2026-07-22T10:15:30Z"));

        service.process("payment.succeeded", PAYMENT_ID);

        assertThat(payment.getStatus()).isEqualTo("succeeded");
        assertThat(payment.getCapturedAt()).isEqualTo(Instant.parse("2026-07-22T10:15:30Z"));
        assertThat(order.getPaymentStatus()).isEqualTo("succeeded");
        verify(orderStateService).transition(order, OrderState.PAID);
        verify(paymentRepository).save(payment);
    }

    @Test
    void process_succeeded_recordsPaymentEvent() {
        when(yooKassaClient.getPayment(PAYMENT_ID))
                .thenReturn(verified("succeeded", "2026-07-22T10:15:30Z"));

        service.process("payment.succeeded", PAYMENT_ID);

        ArgumentCaptor<PaymentEvent> captor = ArgumentCaptor.forClass(PaymentEvent.class);
        verify(paymentEventRepository).save(captor.capture());
        PaymentEvent event = captor.getValue();
        assertThat(event.getProvider()).isEqualTo("YOOKASSA");
        assertThat(event.getExternalEventId()).isEqualTo("yk-1:succeeded");
        assertThat(event.getEventType()).isEqualTo("payment.succeeded");
        assertThat(event.getPayment()).isSameAs(payment);
        assertThat(event.getRawPayload())
                .containsEntry("verifiedStatus", "succeeded")
                .containsEntry("objectId", PAYMENT_ID);
    }

    // ----- payment.canceled -----

    @Test
    void process_verifiedCanceled_transitionsToPaymentFailed() {
        when(yooKassaClient.getPayment(PAYMENT_ID)).thenReturn(verified("canceled", null));

        service.process("payment.canceled", PAYMENT_ID);

        assertThat(payment.getStatus()).isEqualTo("canceled");
        assertThat(order.getPaymentStatus()).isEqualTo("canceled");
        verify(orderStateService).transition(order, OrderState.PAYMENT_FAILED);
    }

    // ----- Idempotency -----

    @Test
    void process_duplicateEvent_skipsProcessing() {
        when(yooKassaClient.getPayment(PAYMENT_ID))
                .thenReturn(verified("succeeded", "2026-07-22T10:15:30Z"));
        when(paymentEventRepository.findByProviderAndExternalEventId("YOOKASSA", "yk-1:succeeded"))
                .thenReturn(Optional.of(new PaymentEvent("YOOKASSA", "yk-1:succeeded",
                        "payment.succeeded", payment, Map.of())));

        service.process("payment.succeeded", PAYMENT_ID);

        assertThat(payment.getStatus()).isEqualTo("pending"); // untouched
        verify(paymentEventRepository, never()).save(any());
        verify(paymentRepository, never()).save(any());
        verifyNoInteractions(orderStateService);
    }

    // ----- Spoofed body: verify-by-fetch wins -----

    @Test
    void process_spoofedSucceededBody_usesVerifiedStatusInstead() {
        // Тело кричит payment.succeeded, но провайдер говорит pending —
        // никакого перехода в PAID.
        when(yooKassaClient.getPayment(PAYMENT_ID)).thenReturn(verified("pending", null));

        service.process("payment.succeeded", PAYMENT_ID);

        assertThat(payment.getStatus()).isEqualTo("pending");
        assertThat(payment.getCapturedAt()).isNull();
        verifyNoInteractions(orderStateService);

        ArgumentCaptor<PaymentEvent> captor = ArgumentCaptor.forClass(PaymentEvent.class);
        verify(paymentEventRepository).save(captor.capture());
        assertThat(captor.getValue().getExternalEventId()).isEqualTo("yk-1:pending");
    }

    @Test
    void process_paymentUnknownToProvider_acksQuietly() {
        when(yooKassaClient.getPayment("yk-spoofed"))
                .thenThrow(new YooKassaApiException("YooKassa getPayment failed with status 404", 404));

        assertThatCode(() -> service.process("payment.succeeded", "yk-spoofed"))
                .doesNotThrowAnyException();

        verifyNoInteractions(paymentRepository, paymentEventRepository, orderStateService);
    }

    // ----- Unknown local payment -----

    @Test
    void process_noLocalPaymentRow_acksWithoutStateChange() {
        when(yooKassaClient.getPayment("yk-foreign")).thenReturn(
                new YooKassaPaymentResponse("yk-foreign", "succeeded", true,
                        new YooKassaAmount("100.00", "RUB"), null, null, Map.of()));
        when(paymentRepository.findByProviderAndExternalPaymentId("YOOKASSA", "yk-foreign"))
                .thenReturn(Optional.empty());

        assertThatCode(() -> service.process("payment.succeeded", "yk-foreign"))
                .doesNotThrowAnyException();

        verify(paymentEventRepository, never()).save(any());
        verifyNoInteractions(orderStateService);
    }

    // ----- Transient verify failure → rethrow (YooKassa повторит) -----

    @Test
    void process_transientVerifyFailure_propagates() {
        when(yooKassaClient.getPayment(PAYMENT_ID))
                .thenThrow(new YooKassaApiException("YooKassa getPayment failed with status 500", 500));

        assertThatThrownBy(() -> service.process("payment.succeeded", PAYMENT_ID))
                .isInstanceOf(YooKassaApiException.class);

        verifyNoInteractions(paymentRepository, paymentEventRepository, orderStateService);
    }

    // ----- State machine conflict: событие записано, ack, ручная сверка -----

    @Test
    void process_illegalOrderTransition_ackedNotRethrown() {
        order.setStatus("cancelled");
        when(yooKassaClient.getPayment(PAYMENT_ID))
                .thenReturn(verified("succeeded", "2026-07-22T10:15:30Z"));
        when(orderStateService.transition(any(Order.class), eq(OrderState.PAID)))
                .thenThrow(new IllegalStateTransitionException("CANCELLED", "PAID"));

        assertThatCode(() -> service.process("payment.succeeded", PAYMENT_ID))
                .doesNotThrowAnyException();

        assertThat(payment.getStatus()).isEqualTo("succeeded");
        verify(paymentEventRepository).save(any(PaymentEvent.class));
        verify(paymentRepository).save(payment);
    }

    // ----- Unexpected verified status -----

    @Test
    void process_unexpectedVerifiedStatus_ignored() {
        when(yooKassaClient.getPayment(PAYMENT_ID)).thenReturn(verified("weird_status", null));

        service.process("payment.something", PAYMENT_ID);

        verifyNoInteractions(paymentRepository, paymentEventRepository, orderStateService);
    }

    // ----- Не даунгрейдим терминальный статус stale-ответом -----

    @Test
    void process_pendingAfterSucceeded_doesNotDowngrade() {
        payment.setStatus("succeeded");
        when(yooKassaClient.getPayment(PAYMENT_ID)).thenReturn(verified("pending", null));

        service.process("payment.pending", PAYMENT_ID);

        assertThat(payment.getStatus()).isEqualTo("succeeded");
        verifyNoInteractions(orderStateService);
    }
}

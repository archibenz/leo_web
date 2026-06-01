package com.reinasleo.api.service;

import com.reinasleo.api.event.OrderStateTransitionEvent;
import com.reinasleo.api.exception.IllegalStateTransitionException;
import com.reinasleo.api.model.Order;
import com.reinasleo.api.model.OrderState;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class OrderStateServiceTest {

    @Mock private OrderRepository orderRepository;
    @Mock private ApplicationEventPublisher events;

    private OrderStateService service;

    @BeforeEach
    void setUp() {
        service = new OrderStateService(orderRepository, events);
        // lenient: не все тесты доходят до save() (disallowed transitions throw,
        // self-transition idempotent). Strict mode иначе валит UnnecessaryStubbingException.
        lenient().when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private Order orderWithStatus(String dbStatus) {
        User user = new User("test@example.com", "Test", "User", "hash", null, false, true);
        Order order = new Order(user, BigDecimal.ZERO);
        order.setStatus(dbStatus);
        return order;
    }

    // ----- Happy path transitions -----

    @Test
    void transition_draftToAwaitingPayment_succeeds() {
        Order order = orderWithStatus("draft");

        service.transition(order, OrderState.AWAITING_PAYMENT);

        assertThat(order.getStatus()).isEqualTo("awaiting_payment");
        verify(orderRepository).save(order);
        verify(events).publishEvent(any(OrderStateTransitionEvent.class));
    }

    @Test
    void transition_awaitingPaymentToPaid_succeeds() {
        Order order = orderWithStatus("awaiting_payment");

        service.transition(order, OrderState.PAID);

        assertThat(order.getStatus()).isEqualTo("paid");
    }

    @Test
    void transition_paidToAwaitingShipment_succeeds() {
        Order order = orderWithStatus("paid");

        service.transition(order, OrderState.AWAITING_SHIPMENT);

        assertThat(order.getStatus()).isEqualTo("awaiting_shipment");
    }

    @Test
    void transition_inTransitToDelivered_succeeds() {
        Order order = orderWithStatus("in_transit");

        service.transition(order, OrderState.DELIVERED);

        assertThat(order.getStatus()).isEqualTo("delivered");
    }

    // ----- Idempotent self-transition -----

    @Test
    void transition_selfToSelf_idempotentNoEvent() {
        Order order = orderWithStatus("paid");

        service.transition(order, OrderState.PAID);

        assertThat(order.getStatus()).isEqualTo("paid");
        verify(events, never()).publishEvent(any());
        verify(orderRepository, never()).save(any());
    }

    // ----- Disallowed transitions -----

    @Test
    void transition_paidToDraft_throwsException() {
        Order order = orderWithStatus("paid");

        assertThatThrownBy(() -> service.transition(order, OrderState.DRAFT))
            .isInstanceOf(IllegalStateTransitionException.class)
            .hasMessageContaining("PAID->DRAFT");

        verify(events, never()).publishEvent(any());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void transition_deliveredToAnything_throwsException() {
        Order order = orderWithStatus("delivered");

        assertThatThrownBy(() -> service.transition(order, OrderState.AWAITING_PAYMENT))
            .isInstanceOf(IllegalStateTransitionException.class);
    }

    @Test
    void transition_cancelledToPaid_throwsException() {
        Order order = orderWithStatus("cancelled");

        assertThatThrownBy(() -> service.transition(order, OrderState.PAID))
            .isInstanceOf(IllegalStateTransitionException.class);
    }

    // ----- Legacy DB values (pending → awaiting_payment, shipped → handed_over) -----

    @Test
    void transition_legacyPendingToPaid_succeeds() {
        Order order = orderWithStatus("pending"); // legacy alias for awaiting_payment

        service.transition(order, OrderState.PAID);

        assertThat(order.getStatus()).isEqualTo("paid");
    }

    @Test
    void transition_legacyShippedToInTransit_succeeds() {
        Order order = orderWithStatus("shipped"); // legacy alias for handed_over

        service.transition(order, OrderState.IN_TRANSIT);

        assertThat(order.getStatus()).isEqualTo("in_transit");
    }

    // ----- Retry from PAYMENT_FAILED -----

    @Test
    void transition_paymentFailedToAwaitingPayment_succeeds() {
        Order order = orderWithStatus("payment_failed");

        service.transition(order, OrderState.AWAITING_PAYMENT);

        assertThat(order.getStatus()).isEqualTo("awaiting_payment");
    }

    // ----- Event content -----

    @Test
    void transition_eventContainsFromAndToStates() {
        Order order = orderWithStatus("awaiting_payment");

        service.transition(order, OrderState.PAID);

        ArgumentCaptor<OrderStateTransitionEvent> captor = ArgumentCaptor.forClass(OrderStateTransitionEvent.class);
        verify(events, times(1)).publishEvent(captor.capture());

        OrderStateTransitionEvent event = captor.getValue();
        assertThat(event.fromState()).isEqualTo(OrderState.AWAITING_PAYMENT);
        assertThat(event.toState()).isEqualTo(OrderState.PAID);
        assertThat(event.occurredAt()).isNotNull();
    }

    // ----- Parameterized: comprehensive allowed transitions -----

    static Stream<Arguments> allowedTransitions() {
        return Stream.of(
            Arguments.of("draft", OrderState.AWAITING_PAYMENT),
            Arguments.of("draft", OrderState.CANCELLED),
            Arguments.of("awaiting_payment", OrderState.PAID),
            Arguments.of("awaiting_payment", OrderState.PAYMENT_FAILED),
            Arguments.of("awaiting_payment", OrderState.CANCELLED),
            Arguments.of("paid", OrderState.AWAITING_SHIPMENT),
            Arguments.of("paid", OrderState.REFUNDED),
            Arguments.of("paid", OrderState.CANCELLED),
            Arguments.of("awaiting_shipment", OrderState.LABEL_CREATED),
            Arguments.of("label_created", OrderState.HANDED_OVER),
            Arguments.of("handed_over", OrderState.IN_TRANSIT),
            Arguments.of("in_transit", OrderState.READY_FOR_PICKUP),
            Arguments.of("in_transit", OrderState.DELIVERED),
            Arguments.of("ready_for_pickup", OrderState.DELIVERED),
            Arguments.of("ready_for_pickup", OrderState.EXPIRED_PICKUP),
            Arguments.of("expired_pickup", OrderState.REFUNDED),
            Arguments.of("returned", OrderState.REFUNDED)
        );
    }

    @ParameterizedTest
    @MethodSource("allowedTransitions")
    void transition_allAllowedPaths_succeed(String fromDb, OrderState toState) {
        Order order = orderWithStatus(fromDb);

        service.transition(order, toState);

        assertThat(order.getStatus()).isEqualTo(toState.toDbValue());
    }

    static Stream<Arguments> disallowedTransitions() {
        return Stream.of(
            Arguments.of("delivered", OrderState.PAID),
            Arguments.of("delivered", OrderState.CANCELLED),
            Arguments.of("refunded", OrderState.PAID),
            Arguments.of("cancelled", OrderState.PAID),
            Arguments.of("draft", OrderState.PAID),                 // skip awaiting_payment
            Arguments.of("draft", OrderState.DELIVERED),
            Arguments.of("paid", OrderState.DRAFT),
            Arguments.of("paid", OrderState.DELIVERED),              // skip shipping steps
            Arguments.of("in_transit", OrderState.DRAFT),
            Arguments.of("awaiting_payment", OrderState.DELIVERED)   // skip everything
        );
    }

    @ParameterizedTest
    @MethodSource("disallowedTransitions")
    void transition_allDisallowedPaths_throw(String fromDb, OrderState toState) {
        Order order = orderWithStatus(fromDb);

        assertThatThrownBy(() -> service.transition(order, toState))
            .isInstanceOf(IllegalStateTransitionException.class);
    }
}

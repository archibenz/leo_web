package com.reinasleo.api.service;

import com.reinasleo.api.event.OrderStateTransitionEvent;
import com.reinasleo.api.exception.IllegalStateTransitionException;
import com.reinasleo.api.model.Order;
import com.reinasleo.api.model.OrderState;
import com.reinasleo.api.repository.OrderRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * State machine для Order. Любое изменение orders.status проходит через
 * этот сервис, а не напрямую через setStatus().
 *
 * Гарантии:
 *  - Только allowed transitions (см. OrderState.TRANSITIONS)
 *  - Self-transition (X → X) — idempotent, не publish'ит event
 *  - Disallowed transition → IllegalStateTransitionException → HTTP 409
 *  - При успешном переходе publish'ит OrderStateTransitionEvent для
 *    listener'ов (Bitrix sync, email, analytics).
 *
 * Не делает: webhook idempotency check (это обязанность вызывающего —
 * WebhookController с INSERT ... ON CONFLICT DO NOTHING RETURNING).
 */
@Service
public class OrderStateService {

    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher events;

    public OrderStateService(OrderRepository orderRepository, ApplicationEventPublisher events) {
        this.orderRepository = orderRepository;
        this.events = events;
    }

    /**
     * Перевести Order в новый state. Caller обязан вызывать в transactional
     * контексте (или этот метод сам открывает свою транзакцию).
     *
     * @return Order после transition (тот же объект, для chain)
     * @throws IllegalStateTransitionException если переход запрещён
     */
    @Transactional
    public Order transition(Order order, OrderState targetState) {
        OrderState currentState = OrderState.fromDbValue(order.getStatus());

        // Idempotent self-transition: возвращаем без change/event.
        if (currentState == targetState) {
            return order;
        }

        if (!currentState.canTransitionTo(targetState)) {
            throw new IllegalStateTransitionException(
                currentState.name(),
                targetState.name()
            );
        }

        order.setStatus(targetState.toDbValue());
        Order saved = orderRepository.save(order);

        // Publish event для listener'ов (Bitrix, email, analytics).
        // @TransactionalEventListener(AFTER_COMMIT) у listener'ов гарантирует
        // что side effects fire'ятся только после успешного DB commit.
        events.publishEvent(OrderStateTransitionEvent.of(saved, currentState, targetState));

        return saved;
    }
}

package com.reinasleo.api.event;

import com.reinasleo.api.model.Order;
import com.reinasleo.api.model.OrderState;

import java.time.Instant;
import java.util.UUID;

/**
 * Spring application event — publish'ится из OrderStateService.transition()
 * через ApplicationEventPublisher. В Phase 5.5 слушается BitrixCrmService
 * через @TransactionalEventListener(AFTER_COMMIT) для outgoing sync.
 *
 * Также может слушаться:
 *  - EmailService для отправки confirmation на каждом state change
 *  - AnalyticsService для трекинга conversion funnel
 *
 * AFTER_COMMIT semantics критичны: side effects (Bitrix push, email)
 * должны срабатывать ТОЛЬКО после успешного DB commit'а. При rollback
 * транзакции event не fire'ится.
 */
public record OrderStateTransitionEvent(
    UUID orderId,
    OrderState fromState,
    OrderState toState,
    Instant occurredAt
) {
    public static OrderStateTransitionEvent of(Order order, OrderState fromState, OrderState toState) {
        return new OrderStateTransitionEvent(
            order.getId(),
            fromState,
            toState,
            Instant.now()
        );
    }
}

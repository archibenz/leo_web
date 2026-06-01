package com.reinasleo.api.model;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * State machine для Order. Mapping в БД через String column (orders.status)
 * для backwards compatibility с legacy 'pending' / 'shipped' значениями.
 *
 * Order flow:
 *   DRAFT → AWAITING_PAYMENT → PAID → AWAITING_SHIPMENT → LABEL_CREATED
 *     → HANDED_OVER → IN_TRANSIT → READY_FOR_PICKUP → DELIVERED
 *
 * Terminal failure states: CANCELLED, PAYMENT_FAILED, REFUNDED, RETURNED, EXPIRED_PICKUP.
 *
 * Allowed transitions определены в TRANSITIONS map. Любой переход не из
 * map — IllegalStateTransitionException (HTTP 409). Self-transition (X → X)
 * idempotent: возвращает existing state без exception.
 */
public enum OrderState {
    DRAFT,
    AWAITING_PAYMENT,
    PAID,
    AWAITING_SHIPMENT,
    LABEL_CREATED,
    HANDED_OVER,
    IN_TRANSIT,
    READY_FOR_PICKUP,
    DELIVERED,
    CANCELLED,
    PAYMENT_FAILED,
    REFUNDED,
    RETURNED,
    EXPIRED_PICKUP;

    /**
     * Allowed transitions: from → set of allowed `to` states.
     * Self-transitions (X → X) обрабатываются отдельно (idempotent) и не
     * требуется здесь.
     */
    public static final Map<OrderState, Set<OrderState>> TRANSITIONS = Map.ofEntries(
        Map.entry(DRAFT, EnumSet.of(AWAITING_PAYMENT, CANCELLED)),
        Map.entry(AWAITING_PAYMENT, EnumSet.of(PAID, PAYMENT_FAILED, CANCELLED)),
        Map.entry(PAID, EnumSet.of(AWAITING_SHIPMENT, REFUNDED, CANCELLED)),
        Map.entry(AWAITING_SHIPMENT, EnumSet.of(LABEL_CREATED, CANCELLED, REFUNDED)),
        Map.entry(LABEL_CREATED, EnumSet.of(HANDED_OVER, CANCELLED, REFUNDED)),
        Map.entry(HANDED_OVER, EnumSet.of(IN_TRANSIT, RETURNED, REFUNDED)),
        Map.entry(IN_TRANSIT, EnumSet.of(READY_FOR_PICKUP, DELIVERED, RETURNED)),
        Map.entry(READY_FOR_PICKUP, EnumSet.of(DELIVERED, EXPIRED_PICKUP, RETURNED)),
        // Terminal states: no outbound transitions.
        Map.entry(DELIVERED, EnumSet.noneOf(OrderState.class)),
        Map.entry(CANCELLED, EnumSet.noneOf(OrderState.class)),
        Map.entry(PAYMENT_FAILED, EnumSet.of(AWAITING_PAYMENT)), // retry allowed
        Map.entry(REFUNDED, EnumSet.noneOf(OrderState.class)),
        Map.entry(RETURNED, EnumSet.of(REFUNDED)), // returned package → refund money
        Map.entry(EXPIRED_PICKUP, EnumSet.of(RETURNED, REFUNDED))
    );

    public boolean canTransitionTo(OrderState next) {
        if (this == next) return true; // idempotent self-transition
        return TRANSITIONS.getOrDefault(this, EnumSet.noneOf(OrderState.class)).contains(next);
    }

    public boolean isTerminal() {
        return this == DELIVERED || this == CANCELLED || this == REFUNDED;
    }

    /**
     * Преобразование строки из БД в enum. Поддерживает legacy aliases.
     */
    public static OrderState fromDbValue(String dbValue) {
        if (dbValue == null) return null;
        return switch (dbValue) {
            case "draft" -> DRAFT;
            case "pending", "awaiting_payment" -> AWAITING_PAYMENT;
            case "paid" -> PAID;
            case "awaiting_shipment" -> AWAITING_SHIPMENT;
            case "label_created" -> LABEL_CREATED;
            case "handed_over", "shipped" -> HANDED_OVER;
            case "in_transit" -> IN_TRANSIT;
            case "ready_for_pickup" -> READY_FOR_PICKUP;
            case "delivered" -> DELIVERED;
            case "cancelled" -> CANCELLED;
            case "payment_failed" -> PAYMENT_FAILED;
            case "refunded" -> REFUNDED;
            case "returned" -> RETURNED;
            case "expired_pickup" -> EXPIRED_PICKUP;
            default -> throw new IllegalArgumentException("Unknown Order status in DB: " + dbValue);
        };
    }

    public String toDbValue() {
        return name().toLowerCase();
    }
}

package com.reinasleo.api.exception;

/**
 * Checkout выключен feature-флагом (CHECKOUT_ENABLED=false). Mapped в
 * RestExceptionHandler на HTTP 503 — фронт показывает «оплата временно
 * недоступна» вместо генерик-ошибки.
 */
public class CheckoutDisabledException extends RuntimeException {

    public CheckoutDisabledException() {
        super("checkout_disabled");
    }
}

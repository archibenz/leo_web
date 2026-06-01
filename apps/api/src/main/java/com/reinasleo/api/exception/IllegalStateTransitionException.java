package com.reinasleo.api.exception;

/**
 * Брошен из OrderStateService.transition() когда переход между двумя
 * Order state'ами не разрешён в state machine. Mapped в RestExceptionHandler
 * на HTTP 409 CONFLICT (это конфликт состояний, не invalid input).
 */
public class IllegalStateTransitionException extends RuntimeException {
    private final String fromState;
    private final String toState;

    public IllegalStateTransitionException(String fromState, String toState) {
        super("illegal_state_transition:" + fromState + "->" + toState);
        this.fromState = fromState;
        this.toState = toState;
    }

    public String getFromState() { return fromState; }
    public String getToState() { return toState; }
}

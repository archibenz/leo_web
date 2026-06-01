-- =============================================
-- V25: таблица payments.
--
-- Один Order → много payment attempts (retry на failed cards, partial
-- refunds — каждый refund отдельная provider transaction со своим ID).
-- UNIQUE(provider, external_payment_id) обеспечивает идемпотентность при
-- параллельных webhook'ах.
--
-- amount хранится отдельно от orders.total: orders.total — итоговая сумма
-- к оплате, payments.amount — фактически списанная (может отличаться при
-- partial capture / hold).
--
-- version (optimistic lock) защищает от race conditions при concurrent
-- webhook + admin refund на одной payment row.
-- =============================================

CREATE TABLE payments (
    id                  UUID PRIMARY KEY,
    order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    provider            VARCHAR(16) NOT NULL,
    external_payment_id VARCHAR(255) NOT NULL,
    status              VARCHAR(32) NOT NULL,
    amount              NUMERIC(12, 2) NOT NULL,
    refunded_amount     NUMERIC(12, 2) NOT NULL DEFAULT 0,
    captured_at         TIMESTAMPTZ,
    metadata            JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version             BIGINT NOT NULL DEFAULT 0,
    UNIQUE(provider, external_payment_id),
    CONSTRAINT chk_payments_status CHECK (
        status IN ('pending', 'waiting_for_capture', 'succeeded', 'canceled', 'refunded', 'failed')
    ),
    CONSTRAINT chk_payments_provider CHECK (
        provider IN ('YOOKASSA')
    ),
    CONSTRAINT chk_payments_amount_non_negative CHECK (amount >= 0),
    CONSTRAINT chk_payments_refunded_le_amount CHECK (refunded_amount <= amount)
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX idx_payments_status ON payments(status);

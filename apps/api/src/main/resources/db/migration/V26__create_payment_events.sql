-- =============================================
-- V26: payment_events для webhook idempotency.
--
-- UNIQUE(provider, external_event_id) обеспечивает atomic insert через
-- INSERT ... ON CONFLICT DO NOTHING RETURNING id pattern. Если RETURNING
-- пуст → event уже обработан → return 200 без re-processing.
--
-- raw_payload хранится с masked PII (через PaymentEventSanitizer перед
-- persist) — 152-ФЗ Art.5(7) data minimization + GDPR Art.5(1)(c).
-- Маскируются: card.last4, payer.email, IIN (первые 6 цифр карты).
-- =============================================

CREATE TABLE payment_events (
    id                UUID PRIMARY KEY,
    provider          VARCHAR(16) NOT NULL,
    external_event_id VARCHAR(255) NOT NULL,
    event_type        VARCHAR(64) NOT NULL,
    payment_id        UUID REFERENCES payments(id) ON DELETE RESTRICT,
    raw_payload       JSONB NOT NULL,
    received_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(provider, external_event_id),
    CONSTRAINT chk_payment_events_provider CHECK (
        provider IN ('YOOKASSA')
    )
);

CREATE INDEX idx_payment_events_payment_id
    ON payment_events(payment_id)
    WHERE payment_id IS NOT NULL;

CREATE INDEX idx_payment_events_received_at
    ON payment_events(received_at DESC);

-- Партиционирование по received_at можно добавить позже когда таблица
-- начнёт расти (через V?? миграцию). Пока оставляем плоской.

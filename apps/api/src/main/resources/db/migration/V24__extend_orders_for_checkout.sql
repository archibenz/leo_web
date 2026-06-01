-- =============================================
-- V24: расширение orders для on-site checkout subsystem.
--
-- Добавляем поля для интеграций:
--   payment_status, delivery_provider, delivery_method, delivery_cost,
--   customer_email/phone/name — основные данные checkout'а.
--   delivery_address хранится JSONB inline — snapshot semantics, заказ это
--   исторический документ, адрес не должен меняться при edit профиля юзером.
--   idempotency_key UNIQUE — защита от двойного клика на POST /checkout.
--
-- Обновляем chk_orders_status: расширяем с 5 значений до 16. Старые значения
-- (pending, paid, shipped, delivered, cancelled) сохраняются для совместимости
-- с существующими orders в БД. Новые отражают полный flow checkout subsystem:
--   draft → awaiting_payment → paid → awaiting_shipment → label_created
--     → handed_over → in_transit → ready_for_pickup → delivered
--   plus terminal: cancelled, payment_failed, refunded, returned, expired_pickup
--
-- 'shipped' и 'pending' помечены deprecated в коде; останутся в CHECK для
-- legacy rows. Новый код использует 'awaiting_payment' и 'handed_over'.
-- =============================================

ALTER TABLE orders
    ADD COLUMN payment_status         VARCHAR(32),
    ADD COLUMN delivery_provider      VARCHAR(32),
    ADD COLUMN delivery_provider_meta JSONB,
    ADD COLUMN delivery_method        VARCHAR(64),
    ADD COLUMN delivery_cost          NUMERIC(12, 2),
    ADD COLUMN delivery_address       JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN customer_email         VARCHAR(255),
    ADD COLUMN customer_phone         VARCHAR(32),
    ADD COLUMN customer_name          VARCHAR(255),
    ADD COLUMN idempotency_key        VARCHAR(64);

-- Partial unique: NULL idempotency_key для legacy orders OK, новые с
-- non-NULL должны быть unique для защиты от двойного клика.
CREATE UNIQUE INDEX uq_orders_idempotency_key
    ON orders(idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- Расширение CHECK status.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_orders_status;
ALTER TABLE orders
    ADD CONSTRAINT chk_orders_status
    CHECK (status IN (
        'draft',
        'pending',              -- legacy alias for awaiting_payment
        'awaiting_payment',
        'paid',
        'awaiting_shipment',
        'label_created',
        'handed_over',
        'shipped',              -- legacy alias for handed_over
        'in_transit',
        'ready_for_pickup',
        'delivered',
        'cancelled',
        'payment_failed',
        'refunded',
        'returned',
        'expired_pickup'
    ));

-- payment_status nullable для legacy orders без оплаты через нашу систему.
ALTER TABLE orders
    ADD CONSTRAINT chk_orders_payment_status
    CHECK (payment_status IS NULL OR payment_status IN (
        'pending',
        'waiting_for_capture',
        'succeeded',
        'canceled',
        'refunded',
        'failed'
    ));

-- delivery_provider nullable для legacy orders без выбранной доставки.
-- OTHER — escape valve если Apiship добавит новую службу до redeploy.
ALTER TABLE orders
    ADD CONSTRAINT chk_orders_delivery_provider
    CHECK (delivery_provider IS NULL OR delivery_provider IN (
        'CDEK',
        'BOXBERRY',
        'POCHTA',
        'FIVEPOST',
        'YANDEX',
        'PEK',
        'DALLI',
        'OZON_DELIVERY',
        'OTHER'
    ));

-- Индексы для admin-фильтрации и отчётов.
CREATE INDEX idx_orders_payment_status
    ON orders(payment_status)
    WHERE payment_status IS NOT NULL;

CREATE INDEX idx_orders_delivery_provider
    ON orders(delivery_provider)
    WHERE delivery_provider IS NOT NULL;

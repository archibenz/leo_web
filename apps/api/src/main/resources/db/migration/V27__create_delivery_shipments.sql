-- =============================================
-- V27: delivery_shipments для трекинга посылок.
--
-- aggregator — через какую систему организована доставка (Apiship — наш
-- aggregator в MVP, OZON_DIRECT — future Phase 7 если когда-то выйдем на
-- прямую интеграцию с Ozon Logistic). UNIQUE(aggregator, external_order_id)
-- — id внутри aggregator (Apiship orderId).
--
-- provider — конкретная курьерская служба (СДЭК, Boxberry, ...) — то же
-- значение что в orders.delivery_provider.
--
-- tracking_number — service-level tracking (тот номер который клиент видит
-- на сайте СДЭК/Boxberry). NULL если ещё не присвоен.
--
-- status_updates JSONB — массив status events от Apiship webhook'ов. Хранит
-- историю переходов: [{timestamp, status, location}, ...] для audit trail
-- и debugging задержек доставки.
-- =============================================

CREATE TABLE delivery_shipments (
    id                UUID PRIMARY KEY,
    order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    aggregator        VARCHAR(16) NOT NULL DEFAULT 'APISHIP',
    provider          VARCHAR(32) NOT NULL,
    external_order_id VARCHAR(255) NOT NULL,
    tracking_number   VARCHAR(255),
    label_url         VARCHAR(1024),
    status            VARCHAR(64),
    status_updates    JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version           BIGINT NOT NULL DEFAULT 0,
    UNIQUE(aggregator, external_order_id),
    CONSTRAINT chk_shipments_aggregator CHECK (
        aggregator IN ('APISHIP', 'OZON_DIRECT')
    ),
    CONSTRAINT chk_shipments_provider CHECK (
        provider IN ('CDEK', 'BOXBERRY', 'POCHTA', 'FIVEPOST', 'YANDEX',
                     'PEK', 'DALLI', 'OZON_DELIVERY', 'OTHER')
    )
);

CREATE INDEX idx_shipments_order_id ON delivery_shipments(order_id);
CREATE INDEX idx_shipments_tracking
    ON delivery_shipments(tracking_number)
    WHERE tracking_number IS NOT NULL;
CREATE INDEX idx_shipments_status ON delivery_shipments(status) WHERE status IS NOT NULL;

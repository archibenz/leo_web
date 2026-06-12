-- =============================================
-- V28: таблица product_stock_alerts.
--
-- Подписки «сообщить о наличии»: пользователь подписывается на товар
-- с нулевым остатком и получает Telegram-уведомление, когда товар
-- возвращается в наличие. Подписки одноразовые — после рассылки все
-- строки по product_id удаляются.
--
-- UNIQUE(user_id, product_id) — повторная подписка идемпотентна.
-- =============================================

CREATE TABLE product_stock_alerts (
    id         UUID PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id VARCHAR(128) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

CREATE INDEX idx_psa_product_id ON product_stock_alerts(product_id);

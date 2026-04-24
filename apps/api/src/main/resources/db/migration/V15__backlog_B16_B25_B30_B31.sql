-- V15: закрываем беклог-тикеты B16, B25, B30, B31.

-- =========================================================================
-- B25: partial index для активных telegram_auth_tokens + ежечасная чистка.
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_tgauth_token_active
    ON telegram_auth_tokens (token)
    WHERE used = false;

-- =========================================================================
-- B30: CHECK constraint на orders.status.
-- Аудит кода: в apps/api/src/main/java/com/reinasleo/api/model/Order.java
-- используется только "pending" (значение по умолчанию). Других вызовов
-- setStatus(...) с литералами в сервисах нет на момент V15. Список значений
-- зафиксирован заранее для будущего расширения workflow'а.
-- =========================================================================
ALTER TABLE orders
    ADD CONSTRAINT chk_orders_status
    CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'));

-- =========================================================================
-- B31: NOT NULL для колонок с DEFAULT из V7, у которых забыли NOT NULL.
-- Перед ALTER — safety UPDATE, ставим дефолт там, где NULL.
-- =========================================================================
UPDATE site_config SET updated_at = NOW() WHERE updated_at IS NULL;
ALTER TABLE site_config ALTER COLUMN updated_at SET NOT NULL;

UPDATE product_recommendations SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE product_recommendations ALTER COLUMN created_at SET NOT NULL;

UPDATE product_recommendations SET sort_order = 0 WHERE sort_order IS NULL;
ALTER TABLE product_recommendations ALTER COLUMN sort_order SET NOT NULL;

-- =========================================================================
-- B16: индекс для выборки активных товаров, отсортированных по дате.
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_products_active
    ON products (active, created_at DESC);

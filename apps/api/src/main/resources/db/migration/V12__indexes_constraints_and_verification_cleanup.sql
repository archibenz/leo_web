-- =============================================
-- V12: FK-индексы, CHECK-ограничения, очистка verification_codes
-- =============================================

-- A13 / A29: индексы на FK-колонки, чтобы DELETE FROM products
-- не вызывал seq scan на cart_items / order_items при каскадной проверке.
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id  ON cart_items  (product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON order_items (order_id);

-- A30: разовая чистка устаревших кодов верификации.
-- Дальше ежедневно удаляет VerificationCodeCleanupTask (Spring @Scheduled).
DELETE FROM verification_codes WHERE expires_at < NOW() - INTERVAL '7 days';

-- A39: CHECK на допустимые статусы заказа. Значения совпадают с теми,
-- что используются в коде (Order.status = "pending" по умолчанию)
-- и с STATUS_LABELS во фронтенд-админке.
ALTER TABLE orders
    ADD CONSTRAINT orders_status_check
    CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled'));

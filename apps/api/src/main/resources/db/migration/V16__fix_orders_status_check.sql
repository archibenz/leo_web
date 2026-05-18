-- =============================================
-- V16: разрешаем конфликт CHECK-ограничений на orders.status.
-- V12 добавил `orders_status_check` со значениями
--   ('pending','paid','shipped','delivered','cancelled').
-- V15 поверх него добавил `chk_orders_status` со значениями
--   ('pending','confirmed','shipped','delivered','cancelled').
-- Два CHECK работают по AND, поэтому реально допустимым оставался только
-- intersection: ('pending','shipped','delivered','cancelled'). Это ломало
-- любую попытку перевести заказ в статус 'paid', который уже описан в
-- STATUS_LABELS фронтенд-админки и совпадает с дефолтным workflow'ом.
--
-- Решение: дропаем оба старых ограничения и ставим единое со списком,
-- который покрывает фактически используемые значения. На текущий момент
-- в коде Order.java/OrderService.java выставляется только 'pending'
-- (default); остальные значения зарезервированы под будущий workflow.
-- =============================================

-- Сначала чиним rogue rows, если они есть. UPDATE безопасен: возвращаем
-- любой нелегальный status к дефолту 'pending', чтобы не отвалился ALTER.
UPDATE orders
   SET status = 'pending'
 WHERE status NOT IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled');

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_orders_status;

ALTER TABLE orders
    ADD CONSTRAINT chk_orders_status
    CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled'));

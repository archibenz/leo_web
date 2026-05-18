-- V20: уникальный индекс на cart_items с COALESCE(size, '').
-- V2 уже завёл UNIQUE (cart_id, product_id, size), но Postgres трактует
-- NULL ≠ NULL в обычном UNIQUE, поэтому для товаров без размера ограничение
-- не работает и две параллельные сессии addItem могут вставить дубль.
-- Expression-based UNIQUE через COALESCE закрывает эту дыру.

-- Safety: на случай уже накопившихся дублей оставляем строку с минимальным id
-- (её quantity сохраняется), остальные удаляем.
WITH dups AS (
    SELECT id,
           RANK() OVER (
               PARTITION BY cart_id, product_id, COALESCE(size, '')
               ORDER BY id
           ) AS rnk
    FROM cart_items
)
DELETE FROM cart_items
WHERE id IN (SELECT id FROM dups WHERE rnk > 1);

CREATE UNIQUE INDEX uq_cart_items_cart_product_size
    ON cart_items (cart_id, product_id, COALESCE(size, ''));

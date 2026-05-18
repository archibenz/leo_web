-- V20 cart_items unique-index hardening
-- 1) drop V2's plain UNIQUE constraint (NULL-distinct on size: two rows with
--    size IS NULL on same cart/product would slip through)
-- 2) dedupe by summing quantity into the lowest-id surviving row
-- 3) create a NULL-safe UNIQUE INDEX on (cart_id, product_id, COALESCE(size, ''))

ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS uq_cart_product_size;

-- Merge quantity for duplicates: sum total, write back into the lowest-id row.
-- Stock check is enforced at addItem/checkout time, not here; if a pre-existing
-- duplicate sum exceeds current stock the user adjusts at checkout.
WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY cart_id, product_id, COALESCE(size, '')
               ORDER BY id
           ) AS rn,
           SUM(quantity) OVER (
               PARTITION BY cart_id, product_id, COALESCE(size, '')
           ) AS total_qty
    FROM cart_items
)
UPDATE cart_items SET quantity = ranked.total_qty
FROM ranked
WHERE cart_items.id = ranked.id AND ranked.rn = 1;

DELETE FROM cart_items WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (
            PARTITION BY cart_id, product_id, COALESCE(size, '')
            ORDER BY id
        ) AS rn
        FROM cart_items
    ) dups
    WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cart_items_cart_product_size
    ON cart_items (cart_id, product_id, COALESCE(size, ''));

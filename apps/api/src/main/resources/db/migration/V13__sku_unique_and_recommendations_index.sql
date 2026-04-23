-- =============================================
-- V13: UNIQUE на products.sku, индекс на product_recommendations.recommended_product_id
-- =============================================

-- A39: products.sku должен быть уникален. NULL допускается (не у всех товаров есть SKU).
-- Partial UNIQUE INDEX — один и тот же SKU не может принадлежать двум активным товарам;
-- NULL'ы игнорируются, поэтому товары без SKU не мешают.
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku
    ON products (sku)
    WHERE sku IS NOT NULL;

-- A40: FK product_recommendations.recommended_product_id без индекса.
-- При DELETE товара PostgreSQL делает seq scan по product_recommendations для каскадной проверки.
-- idx_recommendations_product уже есть на product_id (V7), но на recommended_product_id — нет.
CREATE INDEX IF NOT EXISTS idx_recommendations_recommended
    ON product_recommendations (recommended_product_id);

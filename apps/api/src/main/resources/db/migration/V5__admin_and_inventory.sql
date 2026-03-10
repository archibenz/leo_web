-- =============================================
-- V5: Admin panel, collections, inventory system
-- =============================================

-- 1. Add role to users
ALTER TABLE users ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT 'user';

-- 2. Collections table
CREATE TABLE collections (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    image_url   VARCHAR(512),
    active      BOOLEAN NOT NULL DEFAULT true,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Expand products table
ALTER TABLE products ADD COLUMN collection_id UUID REFERENCES collections(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN stock_quantity INT NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN low_stock_threshold INT NOT NULL DEFAULT 5;
ALTER TABLE products ADD COLUMN is_test BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE products ADD COLUMN occasion VARCHAR(64);
ALTER TABLE products ADD COLUMN color VARCHAR(64);
ALTER TABLE products ADD COLUMN material VARCHAR(64);
ALTER TABLE products ADD COLUMN subtitle VARCHAR(255);
ALTER TABLE products ADD COLUMN sku VARCHAR(64);
ALTER TABLE products ADD COLUMN images JSONB NOT NULL DEFAULT '[]';

CREATE INDEX idx_products_collection ON products (collection_id);
CREATE INDEX idx_products_active ON products (active);

-- 4. Mark existing seeded products as test
UPDATE products SET is_test = true WHERE id IN ('silk-evening-gown', 'sculptured-wool-coat', 'cashmere-cardigan');

-- Also set their extra fields
UPDATE products SET occasion = 'evening', color = 'burgundy', material = 'silk', subtitle = 'Evening · Silk', sku = 'RL-SEG-001',
    images = '[{"src":"","alt":"Silk Evening Gown — front"},{"src":"","alt":"Silk Evening Gown — detail"}]'::jsonb
WHERE id = 'silk-evening-gown';

UPDATE products SET occasion = 'office', color = 'charcoal', material = 'wool', subtitle = 'Outerwear · Wool', sku = 'RL-SWC-002',
    images = '[{"src":"","alt":"Sculptured Wool Coat — front"},{"src":"","alt":"Sculptured Wool Coat — side"}]'::jsonb
WHERE id = 'sculptured-wool-coat';

UPDATE products SET occasion = 'casual', color = 'oatmeal', material = 'cashmere', subtitle = 'Knitwear · Cashmere', sku = 'RL-CDC-003',
    images = '[{"src":"","alt":"Cashmere Cardigan — front"},{"src":"","alt":"Cashmere Cardigan — draped"}]'::jsonb
WHERE id = 'cashmere-cardigan';

-- 5. Stock alerts table
CREATE TABLE stock_alerts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  VARCHAR(128) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    alert_type  VARCHAR(32) NOT NULL, -- 'low_stock' or 'out_of_stock'
    acknowledged BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_alerts_unacked ON stock_alerts (acknowledged) WHERE acknowledged = false;

-- 6. Seed test collections and products
INSERT INTO collections (id, name, slug, description, image_url, active, sort_order) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Autumn Essence 2024', 'autumn-essence-2024',
     'A curated selection of warm-toned pieces for the transitional season.', NULL, true, 1),
    ('a0000000-0000-0000-0000-000000000002', 'Winter Luxe 2024', 'winter-luxe-2024',
     'Luxurious fabrics and silhouettes for the coldest months.', NULL, true, 2);

-- Autumn Essence products
INSERT INTO products (id, title, description, price, image, category, sizes, collection_id, is_test, active, occasion, color, material, subtitle, sku, images, stock_quantity) VALUES
    ('ae-tailored-trousers', 'Tailored Wide-Leg Trousers', 'Elegant wide-leg trousers in Italian wool blend. High waist with pressed creases and hidden side zip.', 420.00, NULL, 'trousers',
     ARRAY['XS','S','M','L'], 'a0000000-0000-0000-0000-000000000001', true, true, 'office', 'neutrals', 'wool', 'Office · Wool', 'RL-AE-001',
     '[{"src":"","alt":"Tailored Trousers — front"},{"src":"","alt":"Tailored Trousers — detail"}]'::jsonb, 15),
    ('ae-linen-blouse', 'Linen Resort Blouse', 'Relaxed-fit blouse in European linen. Dropped shoulders and mother-of-pearl buttons.', 280.00, NULL, 'blouses',
     ARRAY['XS','S','M','L'], 'a0000000-0000-0000-0000-000000000001', true, true, 'resort', 'neutrals', 'linen', 'Resort · Linen', 'RL-AE-002',
     '[{"src":"","alt":"Linen Blouse — front"}]'::jsonb, 20),
    ('ae-wrap-dress', 'Chocolate Wrap Dress', 'A flattering wrap dress in organic cotton blend. Midi length with tie waist and flared skirt.', 520.00, NULL, 'dresses',
     ARRAY['S','M','L'], 'a0000000-0000-0000-0000-000000000001', true, true, 'casual', 'chocolate', 'cottonBlend', 'Casual · Cotton Blend', 'RL-AE-003',
     '[{"src":"","alt":"Wrap Dress — front"},{"src":"","alt":"Wrap Dress — side"}]'::jsonb, 8),
    ('ae-pleated-skirt', 'Pleated Wool Skirt', 'Knife-pleated midi skirt in lightweight wool. Sits at natural waist with grosgrain waistband.', 380.00, NULL, 'skirts',
     ARRAY['XS','S','M'], 'a0000000-0000-0000-0000-000000000001', true, true, 'office', 'chocolate', 'wool', 'Office · Wool', 'RL-AE-004',
     '[{"src":"","alt":"Pleated Skirt — front"}]'::jsonb, 12),
    ('ae-cotton-trench', 'Cotton-Blend Trench Coat', 'A modern trench coat in water-resistant cotton blend. Storm flap, removable belt, and horn buttons.', 890.00, NULL, 'outerwear',
     ARRAY['S','M','L'], 'a0000000-0000-0000-0000-000000000001', true, true, 'casual', 'neutrals', 'cottonBlend', 'Casual · Cotton Blend', 'RL-AE-005',
     '[{"src":"","alt":"Trench Coat — front"},{"src":"","alt":"Trench Coat — back"}]'::jsonb, 6);

-- Winter Luxe products
INSERT INTO products (id, title, description, price, image, category, sizes, collection_id, is_test, active, occasion, color, material, subtitle, sku, images, stock_quantity) VALUES
    ('wl-evening-gown', 'Ceremony Column Dress', 'A floor-length column dress in heavy silk crepe. Architectural neckline and invisible back zip.', 1400.00, NULL, 'dresses',
     ARRAY['XS','S','M','L'], 'a0000000-0000-0000-0000-000000000002', true, true, 'ceremony', 'black', 'silk', 'Ceremony · Silk', 'RL-WL-001',
     '[{"src":"","alt":"Column Dress — front"},{"src":"","alt":"Column Dress — back"}]'::jsonb, 4),
    ('wl-cashmere-turtleneck', 'Cashmere Turtleneck', 'Fine-gauge cashmere turtleneck. Slim fit with ribbed cuffs, hem and collar.', 490.00, NULL, 'knitwear',
     ARRAY['S','M','L'], 'a0000000-0000-0000-0000-000000000002', true, true, 'casual', 'burgundy', 'cashmere', 'Casual · Cashmere', 'RL-WL-002',
     '[{"src":"","alt":"Cashmere Turtleneck — front"}]'::jsonb, 18),
    ('wl-embroidered-bolero', 'Evening Embroidered Bolero', 'Hand-embroidered bolero jacket in silk organza. Crystal and bead detailing.', 740.00, NULL, 'outerwear',
     ARRAY['XS','S','M'], 'a0000000-0000-0000-0000-000000000002', true, true, 'evening', 'burgundy', 'silk', 'Evening · Silk', 'RL-WL-003',
     '[{"src":"","alt":"Bolero — front"},{"src":"","alt":"Bolero — detail"}]'::jsonb, 3),
    ('wl-structured-blazer', 'Structured Blazer', 'Single-breasted blazer in Italian wool. Peak lapels, flap pockets, and padded shoulders.', 780.00, NULL, 'tailoring',
     ARRAY['XS','S','M','L'], 'a0000000-0000-0000-0000-000000000002', true, true, 'office', 'black', 'wool', 'Office · Wool', 'RL-WL-004',
     '[{"src":"","alt":"Blazer — front"},{"src":"","alt":"Blazer — side"}]'::jsonb, 10),
    ('wl-silk-camisole', 'Draped Silk Camisole', 'Cowl-neck camisole in washed silk. Adjustable straps and bias cut.', 310.00, NULL, 'blouses',
     ARRAY['XS','S','M'], 'a0000000-0000-0000-0000-000000000002', true, true, 'evening', 'ivory', 'silk', 'Evening · Silk', 'RL-WL-005',
     '[{"src":"","alt":"Silk Camisole — front"}]'::jsonb, 14);

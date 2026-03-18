CREATE TABLE product_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR(128) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  recommended_product_id VARCHAR(128) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, recommended_product_id)
);
CREATE INDEX idx_recommendations_product ON product_recommendations(product_id);

CREATE TABLE site_config (
  key VARCHAR(128) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO site_config (key, value) VALUES
  ('homepage_hero', '{"enabled": true}'),
  ('homepage_collections', '{"collectionIds": [], "title": "Коллекции"}'),
  ('homepage_featured', '{"productIds": [], "title": "Популярное"}'),
  ('current_season', '{"season": "spring", "year": 2026}');

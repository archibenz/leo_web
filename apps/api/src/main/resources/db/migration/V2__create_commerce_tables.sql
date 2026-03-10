-- Products catalogue
CREATE TABLE products (
    id          VARCHAR(128) PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    price       NUMERIC(12, 2) NOT NULL,
    image       VARCHAR(512),
    category    VARCHAR(128),
    sizes       TEXT[], -- available sizes array
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the 3 existing products
INSERT INTO products (id, title, price, image, category, sizes) VALUES
    ('silk-evening-gown', 'Silk Evening Gown', 2450.00, '/images/products/silk-evening-gown.jpg', 'dresses', ARRAY['XS','S','M','L']),
    ('sculptured-wool-coat', 'Sculptured Wool Coat', 3200.00, '/images/products/sculptured-wool-coat.jpg', 'outerwear', ARRAY['S','M','L','XL']),
    ('cashmere-cardigan', 'Cashmere Cardigan', 1850.00, '/images/products/cashmere-cardigan.jpg', 'knitwear', ARRAY['XS','S','M','L','XL']);

-- Shopping carts (one per user)
CREATE TABLE carts (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_carts_user UNIQUE (user_id)
);

CREATE TABLE cart_items (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id    UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id VARCHAR(128) NOT NULL REFERENCES products(id),
    size       VARCHAR(16),
    quantity   INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_cart_product_size UNIQUE (cart_id, product_id, size)
);

-- Favorites
CREATE TABLE favorites (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id VARCHAR(128) NOT NULL REFERENCES products(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_favorites_user_product UNIQUE (user_id, product_id)
);

-- Orders
CREATE TABLE orders (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status     VARCHAR(32) NOT NULL DEFAULT 'pending',
    total      NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user ON orders (user_id);

CREATE TABLE order_items (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(128) NOT NULL REFERENCES products(id),
    size       VARCHAR(16),
    quantity   INT NOT NULL DEFAULT 1,
    price      NUMERIC(12, 2) NOT NULL
);

-- Analytics: product interest events
CREATE TABLE product_interest_events (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    product_id VARCHAR(128) NOT NULL REFERENCES products(id),
    event_type VARCHAR(32) NOT NULL, -- 'add_to_cart', 'add_to_favorite', 'purchase'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pie_product ON product_interest_events (product_id);
CREATE INDEX idx_pie_type_created ON product_interest_events (event_type, created_at);

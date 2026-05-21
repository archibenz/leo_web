-- Fix V5/V15 conflict: V15 tried to create composite idx_products_active(active, created_at DESC)
-- with IF NOT EXISTS, but the V5 single-column idx_products_active(active) already existed,
-- so V15's composite index was silently skipped. Queries using
-- findByActiveTrueOrderByCreatedAtDesc therefore still do an extra sort step.
DROP INDEX IF EXISTS idx_products_active;
CREATE INDEX idx_products_active ON products (active, created_at DESC);

-- Promote idx_users_email_lower to a partial unique index. The original V1 index
-- treats NULL emails as collidable (only one TG-only user with NULL email can exist).
-- Partial form lets unlimited TG-only users coexist without phantom UNIQUE collisions.
DROP INDEX IF EXISTS idx_users_email_lower;
CREATE UNIQUE INDEX idx_users_email_lower ON users (lower(email)) WHERE email IS NOT NULL;

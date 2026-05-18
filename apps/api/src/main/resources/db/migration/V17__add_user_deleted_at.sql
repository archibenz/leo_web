-- R1: GDPR Art.17 / 152-ФЗ — soft-delete users via deleted_at timestamp.
-- After deletion: PII (email, name, phone, dob, password_hash, telegram_id) is anonymized,
-- but the user row stays so orders/cart_items keep referential integrity.
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;

-- Partial index — most users are not deleted, so only index the ones that are.
CREATE INDEX idx_users_deleted_at ON users (deleted_at) WHERE deleted_at IS NOT NULL;

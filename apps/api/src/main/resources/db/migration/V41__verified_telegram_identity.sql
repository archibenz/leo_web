CREATE TABLE verified_telegram_identities (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    telegram_id BIGINT NOT NULL UNIQUE CHECK (telegram_id > 0),
    telegram_username VARCHAR(32),
    verified_at TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_verified_telegram_lifetime CHECK (valid_until > verified_at),
    CONSTRAINT ck_verified_telegram_username CHECK
        (telegram_username IS NULL OR telegram_username ~ '^[A-Za-z0-9_]{1,32}$')
);

CREATE TABLE telegram_link_challenges (
    token_hash CHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    issuer_expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    CONSTRAINT ck_telegram_link_expiry CHECK
        (expires_at > created_at AND expires_at <= issuer_expires_at),
    CONSTRAINT ck_telegram_link_hash CHECK (token_hash ~ '^[0-9a-f]{64}$')
);
CREATE INDEX idx_telegram_link_user ON telegram_link_challenges(user_id);
CREATE INDEX idx_telegram_link_expiry ON telegram_link_challenges(expires_at);

-- Only the new proof owns this invariant; legacy users are not backfilled.
CREATE FUNCTION preserve_verified_telegram_identity() RETURNS trigger LANGUAGE plpgsql AS $body$
BEGIN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.telegram_id IS DISTINCT FROM OLD.telegram_id THEN
        RAISE EXCEPTION 'constraint ck_verified_telegram_immutable'
            USING ERRCODE = '23514', CONSTRAINT = 'ck_verified_telegram_immutable';
    END IF;
    RETURN NEW;
END;
$body$;
CREATE TRIGGER verified_telegram_identity_immutable
    BEFORE UPDATE ON verified_telegram_identities
    FOR EACH ROW EXECUTE FUNCTION preserve_verified_telegram_identity();

-- Account deletion is an UPDATE, so FK cascades alone do not erase this metadata.
CREATE FUNCTION erase_deleted_user_telegram_proof() RETURNS trigger LANGUAGE plpgsql AS $body$
BEGIN
    IF NEW.deleted_at IS NOT NULL THEN
        DELETE FROM verified_telegram_identities WHERE user_id = NEW.id;
        DELETE FROM telegram_link_challenges WHERE user_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$body$;
CREATE TRIGGER deleted_user_telegram_proof_cleanup
    AFTER UPDATE OF deleted_at ON users
    FOR EACH ROW EXECUTE FUNCTION erase_deleted_user_telegram_proof();

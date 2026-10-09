CREATE TABLE IF NOT EXISTS verified_telegram_identities (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    telegram_id BIGINT NOT NULL UNIQUE CHECK (telegram_id > 0),
    telegram_username VARCHAR(32),
    verified_at TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL CHECK (valid_until > verified_at)
);
CREATE TABLE IF NOT EXISTS telegram_link_challenges (
    token_hash CHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    issuer_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed_at TIMESTAMP WITH TIME ZONE,
    CHECK (expires_at > created_at AND expires_at <= issuer_expires_at)
);

-- TG-пользователи могут не иметь email/пароля
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Telegram поля
ALTER TABLE users ADD COLUMN telegram_id BIGINT;
ALTER TABLE users ADD COLUMN phone       VARCHAR(20);

CREATE UNIQUE INDEX idx_users_telegram_id ON users (telegram_id)
    WHERE telegram_id IS NOT NULL;

-- Одноразовые токены для обмена на JWT
CREATE TABLE telegram_auth_tokens (
    token        VARCHAR(64)  PRIMARY KEY,
    telegram_id  BIGINT       NOT NULL,
    user_id      UUID         REFERENCES users(id) ON DELETE CASCADE,
    expires_at   TIMESTAMPTZ  NOT NULL,
    used         BOOLEAN      NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_tat_telegram_id ON telegram_auth_tokens (telegram_id);

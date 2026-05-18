-- R8: 6-значный одноразовый код для подтверждения удаления аккаунта у TG-only
-- пользователей. Старый flow принимал просто telegramId, что слабо: ID видно
-- в URL некоторых клиентов и угоняется одним XSS. Теперь:
--   1) пользователь жмёт "Получить код в Telegram",
--   2) бэк генерит 6 цифр через SecureRandom, шлёт в TG-бот,
--   3) пользователь вводит код в модалку — DELETE /api/auth/me его сверяет.
--
-- Хранится hash кода (SHA-256), не открытый текст, как и в verification_codes (V11).

CREATE TABLE telegram_delete_challenges (
    telegram_id      BIGINT       PRIMARY KEY,
    code_hash        VARCHAR(64)  NOT NULL,
    expires_at       TIMESTAMPTZ  NOT NULL,
    failed_attempts  INT          NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_tg_delete_challenges_expires_at
    ON telegram_delete_challenges (expires_at);

COMMENT ON TABLE telegram_delete_challenges IS
    'R8: одноразовый код подтверждения удаления аккаунта для TG-only юзеров.';
COMMENT ON COLUMN telegram_delete_challenges.code_hash IS
    'SHA-256(code) — открытый текст не хранится, как и в verification_codes.';
COMMENT ON COLUMN telegram_delete_challenges.failed_attempts IS
    'Счётчик неверных попыток ввода кода. После порога запись помечается просроченной.';

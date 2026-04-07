-- =============================================
-- V10: Bot visits tracking
-- Logs every /start (and optional menu interactions) from Telegram bot
-- =============================================

CREATE TABLE bot_visits (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id   BIGINT       NOT NULL,
    username      VARCHAR(255),
    first_name    VARCHAR(255),
    last_name     VARCHAR(255),
    language_code VARCHAR(8),
    source        VARCHAR(32)  NOT NULL DEFAULT 'organic',
    visited_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_bot_visits_telegram_id ON bot_visits (telegram_id);
CREATE INDEX idx_bot_visits_visited_at ON bot_visits (visited_at DESC);
CREATE INDEX idx_bot_visits_source ON bot_visits (source);

COMMENT ON TABLE bot_visits IS 'Логи визитов в Telegram-бот (каждый /start или возврат в меню)';
COMMENT ON COLUMN bot_visits.id IS 'Уникальный ID визита';
COMMENT ON COLUMN bot_visits.telegram_id IS 'ID пользователя в Telegram';
COMMENT ON COLUMN bot_visits.username IS 'Telegram username (может быть NULL если у юзера его нет)';
COMMENT ON COLUMN bot_visits.first_name IS 'Имя из профиля Telegram';
COMMENT ON COLUMN bot_visits.last_name IS 'Фамилия из профиля Telegram';
COMMENT ON COLUMN bot_visits.language_code IS 'Язык интерфейса Telegram (en, ru и т.д.)';
COMMENT ON COLUMN bot_visits.source IS 'Источник: organic (просто /start), deep_link (через ссылку с сайта), menu (возврат в меню)';
COMMENT ON COLUMN bot_visits.visited_at IS 'Время визита';

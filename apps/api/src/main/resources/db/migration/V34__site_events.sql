-- =============================================
-- V34: site_events — собственный сбор поведения витрины (этап 2, задача 7).
--
-- Яндекс.Метрика на сайте уже стоит и остаётся: она не знает про наши
-- варианты (цвет — отдельная сущность, см. V32/WHITE_CATS), черновики и
-- локальную сумку. Эта таблица — не замена Метрике, а то, чего у неё нет.
--
-- product_interest_events (V2) НЕ трогаем и НЕ переиспользуем: там
-- product_id NOT NULL с FK на товар, а просмотр главной, переход в магазин
-- или регистрация к товару не привязаны. Тянуть их в таблицу «интереса к
-- товару» значит врать именем. Перенос единственной старой строки и отказ
-- от старой таблицы — отдельная задача, не эта миграция.
--
-- product_id — ВАРИАНТ (цвет), не модель: колонка ссылается на products,
-- где строка — это конкретная колорвея ('wb-<артикул>'), а не product_models.
-- Без этого «что смотрят» отвечает моделью, а не тем, что покупатель
-- реально увидел на экране.
--
-- NOT VALID — тот же приём, что в V32/V33. Таблица новая и пустая, поэтому
-- обычный ADD CONSTRAINT ничего бы не уронил сегодня — но это будущая
-- миграция, добавляющая событие в список, рискует тем же самым на
-- заполненной таблице. NOT VALID + условная VALIDATE — стандартный способ
-- добавлять CHECK в этом проекте, а не разовое решение для этого случая.
--
-- Персональных данных здесь минимум: ни IP, ни user-agent, ни отпечатков
-- браузера. session_key — случайный псевдоним из sessionStorage, живёт до
-- закрытия вкладки, и не пишется до согласия на cookie (решение владельца
-- 13.09.2026: событие пишется всё равно, но обезличенно). user_id — только
-- для событий, которые и так требуют входа (add_to_cart, add_to_favourite,
-- checkout_start, signup); для просмотров — никогда, это решается в
-- SiteEventService, не здесь.
--
-- user_id ON DELETE SET NULL: в отличие от product_interest_events (где
-- строки при мягком удалении аккаунта остаются привязанными к уже
-- анонимизированному пользователю), сюда встроено «удаление аккаунта видит
-- новые события» из ТЗ. Мягкое удаление не роняет саму строку users, так что
-- этот SET NULL — подстраховка на случай настоящего DELETE; на практике
-- отвязку делает AuthService.deleteAccount() явным UPDATE, тем же приёмом,
-- что уже очищает cart_items/favorites.
--
-- product_id/model_id — без ON DELETE: тот же RESTRICT по умолчанию, что и
-- у orders (V19) — исторические ссылки на витрину не должны молча обнуляться.
-- =============================================

CREATE TABLE site_events (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type   VARCHAR(32) NOT NULL,
    occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    session_key  VARCHAR(64),
    user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    product_id   VARCHAR(128) REFERENCES products(id),
    model_id     UUID REFERENCES product_models(id),
    path         VARCHAR(256),
    locale       VARCHAR(8),
    device       VARCHAR(16),
    marketplace  VARCHAR(16)
);

ALTER TABLE site_events
    ADD CONSTRAINT ck_site_events_event_type
    CHECK (event_type IN (
        'page_view', 'product_view', 'marketplace_click',
        'add_to_cart', 'add_to_favourite', 'checkout_start', 'signup'
    ))
    NOT VALID;

DO $$
DECLARE
    offenders BIGINT;
BEGIN
    SELECT count(*) INTO offenders
      FROM site_events
     WHERE event_type NOT IN (
        'page_view', 'product_view', 'marketplace_click',
        'add_to_cart', 'add_to_favourite', 'checkout_start', 'signup'
     );

    IF offenders = 0 THEN
        ALTER TABLE site_events VALIDATE CONSTRAINT ck_site_events_event_type;
    ELSE
        RAISE WARNING 'ck_site_events_event_type: % строк(и) site_events вне закрытого списка типов; '
                      'правило действует на новые записи, старые не проверены. '
                      'Почините их и выполните ALTER TABLE site_events VALIDATE CONSTRAINT ck_site_events_event_type;',
                      offenders;
    END IF;
END $$;

CREATE INDEX idx_se_occurred ON site_events (occurred_at);
CREATE INDEX idx_se_type_occurred ON site_events (event_type, occurred_at);
CREATE INDEX idx_se_product_occurred ON site_events (product_id, occurred_at);

COMMENT ON TABLE site_events IS
    'Собственный сбор поведения витрины (не Метрика). Хранение 18 месяцев — чистка отдельной задачей, правило описано здесь заранее.';
COMMENT ON COLUMN site_events.event_type IS 'Закрытый список, см. ck_site_events_event_type';
COMMENT ON COLUMN site_events.product_id IS 'Вариант (цвет) — строка products, не product_models';
COMMENT ON COLUMN site_events.session_key IS 'Псевдоним из sessionStorage. NULL — событие до согласия на cookie либо не требующее сессии';

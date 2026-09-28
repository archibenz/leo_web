-- Предзаказ — событие сайта (решение 28.09). Это единственная «заявка» на
-- самом сайте: на 28.09 положить вещь в сумку нельзя ни у одного из 20 товаров
-- (17 — «только на маркетплейсах», 3 — предзаказ формой), и воронка без него
-- показывала бы ноль там, где люди на деле оставляют заявки.
--
-- Правило пересоздаётся тем же приёмом, что в V34: NOT VALID, затем проверка
-- старых строк, и VALIDATE только если нарушителей нет. Жёсткий VALIDATE при
-- случайном мусоре в истории уронил бы Flyway, а с ним и старт API.

ALTER TABLE site_events DROP CONSTRAINT ck_site_events_event_type;

ALTER TABLE site_events
    ADD CONSTRAINT ck_site_events_event_type
    CHECK (event_type IN (
        'page_view', 'product_view', 'marketplace_click',
        'add_to_cart', 'add_to_favourite', 'checkout_start', 'signup', 'preorder'
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
        'add_to_cart', 'add_to_favourite', 'checkout_start', 'signup', 'preorder'
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

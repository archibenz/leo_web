-- =============================================
-- V33: бегущая строка на главной — ticker как ещё один layout блока витрины
-- (этап 2, задача 6).
--
-- Строка едет по той же дороге, что герой и тизер сетов: НЕ новая сущность,
-- а третий layout у storefront_sections. Черновик, публикация, права и сброс
-- кэша достаются бесплатно — тем же механизмом V31/StorefrontDraftMerge.
-- Содержимое (список объявлений) живёт в новой колонке items JSONB — у героя
-- и тизера контент лежит в eyebrow/headline/body, у ticker его заменяет
-- массив строк, потому что это список, а не текст с заголовком.
--
-- NOT VALID — И ЭТО ГЛАВНОЕ, КАК В V32.
-- chk_storefront_sections_layout уже существует (V29) и проверяет ВСЮ
-- таблицу немедленно на обычном ADD CONSTRAINT — одна строка с чужим layout,
-- и Flyway падает на данных прода, а не на копии, где никто не проверял.
-- Поэтому старый CHECK снимается и ставится заново с 'ticker' в списке, но
-- NOT VALID: правило действует на все новые и изменяемые строки сразу, а
-- существующие не пересканируются и уронить деплой не могут. Между DROP и
-- ADD таблица ни секунды не остаётся без CHECK вовсе — Flyway держит всю
-- миграцию в одной транзакции, и снаружи это неразличимо от мгновенной замены.
--
-- Старые строки проверяются следом, но только если они чистые: блок DO ниже
-- считает нарушителей и вызывает VALIDATE CONSTRAINT, только если их ноль.
-- На грязных данных (их тут быть не может — до этой миграции layout и так
-- ограничен парой 'hero'/'sets-teaser' тем же CHECK'ом) — предупреждение в
-- лог, а не падение; чинить руками так же, как описано в V32.
-- =============================================

ALTER TABLE storefront_sections
    ADD COLUMN items JSONB NOT NULL DEFAULT '[]'::jsonb;
COMMENT ON COLUMN storefront_sections.items IS
    'Строки бегущей строки: [{"ru","en"?,"href"?,"until"?}, ...]. Пусто = полосы на сайте нет. Используется только layout=''ticker''';

ALTER TABLE storefront_sections DROP CONSTRAINT chk_storefront_sections_layout;

ALTER TABLE storefront_sections
    ADD CONSTRAINT chk_storefront_sections_layout
    CHECK (layout IN ('hero', 'sets-teaser', 'ticker'))
    NOT VALID;

DO $$
DECLARE
    offenders BIGINT;
BEGIN
    SELECT count(*) INTO offenders
      FROM storefront_sections
     WHERE layout NOT IN ('hero', 'sets-teaser', 'ticker');

    IF offenders = 0 THEN
        ALTER TABLE storefront_sections VALIDATE CONSTRAINT chk_storefront_sections_layout;
    ELSE
        RAISE WARNING 'chk_storefront_sections_layout: % строк(и) storefront_sections вне списка ''hero''/''sets-teaser''/''ticker''; '
                      'правило действует на новые и изменяемые записи, старые не проверены. '
                      'Почините их и выполните ALTER TABLE storefront_sections VALIDATE CONSTRAINT chk_storefront_sections_layout;',
                      offenders;
    END IF;
END $$;

-- Блок идёт первым: sort_order ниже героя (0), а не после него — колонка
-- сравнивается по возрастанию (findByStatusOrderBySortOrderAsc), и «первым»
-- значит «меньше всех остальных», а не «раньше по времени вставки».
-- items='[]' — полосы не будет видно, пока владелец не впишет первую строку
-- через редактор; это ожидаемое состояние сразу после выкатки, не баг.
INSERT INTO storefront_sections (slug, layout, status, name_ru, name_en, items, sort_order)
VALUES ('home-ticker', 'ticker', 'active', 'Бегущая строка', 'Home ticker', '[]'::jsonb, -1)
ON CONFLICT (slug) DO NOTHING;

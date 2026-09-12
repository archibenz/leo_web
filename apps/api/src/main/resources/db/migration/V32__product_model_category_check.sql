-- =============================================
-- V32: категория модели сверяется со списком витрины (этап 2, задача 5).
--
-- До сих пор category был просто VARCHAR(32): опечатка проходила молча, и
-- модель ТИХО пропадала из раздела витрины. Фильтр каталога знает ровно пять
-- значений (apps/web/lib/catalogue/select.ts, WHITE_CATS) — ровно эти пять
-- лежат и в базе после V30.
--
-- Список живёт ЗДЕСЬ, а не вторым хардкодом в DTO: два места разъезжаются,
-- база — нет. Раздел витрины появляется вместе со строкой в этом CHECK и в
-- WHITE_CATS: одна без другой даёт либо невидимый товар, либо пустой фильтр.
--
-- NOT VALID — И ЭТО ГЛАВНОЕ В ЭТОЙ МИГРАЦИИ.
-- Обычный ADD CONSTRAINT ... CHECK проверяет таблицу немедленно: одна строка
-- вне пятёрки — и миграция падает, Flyway встаёт, API не поднимается. Проверять
-- это на копии базы бессмысленно — падает она на данных ПРОДА. С NOT VALID
-- правило действует на все новые и изменяемые строки сразу, а старые не
-- трогаются, и уронить деплой оно не может в принципе.
--
-- Старые данные проверяются следом, но только если они чистые: VALIDATE
-- выполняется под условием, а на грязных данных вместо падения остаётся
-- предупреждение в логе с числом нарушителей. Деплою это не мешает, а
-- незамеченным не останется.
--
-- Если предупреждение всё же появилось — починить строки и выполнить руками:
--   ALTER TABLE product_models VALIDATE CONSTRAINT ck_product_models_category;
--
-- Колонка products.category НЕ трогается: она легаси (V2), её пишет старая
-- админка своими значениями, и витрина её не читает.
-- =============================================

ALTER TABLE product_models
    ADD CONSTRAINT ck_product_models_category
    CHECK (category IN ('dresses', 'outerwear', 'knitwear', 'tailoring', 'skirts'))
    NOT VALID;

DO $$
DECLARE
    offenders BIGINT;
BEGIN
    SELECT count(*) INTO offenders
      FROM product_models
     WHERE category NOT IN ('dresses', 'outerwear', 'knitwear', 'tailoring', 'skirts');

    IF offenders = 0 THEN
        ALTER TABLE product_models VALIDATE CONSTRAINT ck_product_models_category;
    ELSE
        RAISE WARNING 'ck_product_models_category: % строк(и) product_models вне списка разделов витрины; '
                      'правило действует на новые записи, старые не проверены. '
                      'Почините их и выполните ALTER TABLE product_models VALIDATE CONSTRAINT ck_product_models_category;',
                      offenders;
    END IF;
END $$;

COMMENT ON COLUMN product_models.category IS 'Раздел витрины. Список закрыт ck_product_models_category и совпадает с WHITE_CATS во фронтенде';

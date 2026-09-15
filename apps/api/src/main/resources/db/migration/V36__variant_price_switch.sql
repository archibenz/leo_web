-- =============================================
-- V36: переключатель источника цены и скидка процентом (этап 2).
--
-- Два новых поля у варианта (products): price_source и discount_pct. Оба
-- решают только то, что ПОКАЗЫВАЕТ витрина и админка — сама таблица
-- marketplace_prices (V35) не меняется ни строкой; вычисление действующей
-- цены живёт в VariantPriceCalculator (apps/api, service/storefront), не в
-- базе.
--
-- ПИСАТЬ ПОД PostgreSQL 14, А НЕ 16 — И ЭТО ПРОВЕРЕНО ПРОТИВ НАСТОЯЩЕЙ 14.
-- На проде PostgreSQL 14.24, docker-compose.yml объявляет postgres:16-alpine,
-- и вчера (15.09.2026, см. заголовок V35) это расхождение уже стоило десяти
-- минут простоя: V35 ушла с UNIQUE ... NULLS NOT DISTINCT (нужен 15+), Flyway
-- упал, Spring не поднялся, /api/health отдавал 502. Эта миграция целиком —
-- ALTER, оба CHECK, DO-блоки валидации, backfill ниже — прогнана против
-- контейнера postgres:14 (`show server_version` вернул 14.24 Debian), и не
-- только фактом «применилась без ошибки»: живыми INSERT/UPDATE с заранее
-- объявленным ожиданием на каждый, включая обязанные упасть. Полный протокол
-- проверки — в отчёте задачи (task-price-switch-report.md), рядом с задачей.
--
-- price_source VARCHAR, не enum: тот же приём, что source в marketplace_prices
-- (V35) — список уже закрыт Bean Validation на входе (StorefrontVariantRequest)
-- и CHECK на входе в БД, третьего места одному и тому же правилу не нужно.
--
-- 'wildberries' НЕ в списке источников цены — намеренно, не забыли. Цена WB
-- непроверена (этап 4 заблокирован по плану), и разрешить переключатель на
-- источник, которому сами не доверяем, значило бы дать владельцу кнопку,
-- которая выглядит рабочей, а по факту способна показать неверную цифру.
-- Расширить список — правка одного CHECK ниже, а не повод обходить его.
--
-- discount_pct: 0..90 в CHECK — сторож от опечатки, а НЕ деловое правило.
-- Скидка в 100% делает цену нулевой, и такой ввод почти наверняка промах по
-- клавише (или перепутанные местами цена и процент). Если владелец однажды
-- захочет распродажу глубже 90% — это правка одного числа в CHECK ниже, а НЕ
-- повод обходить ограничение в коде. Та же граница нигде не продублирована
-- в Java: единственное число живёт здесь, VariantPriceCalculator ему верит.
--
-- NOT VALID + условная VALIDATE в DO $$ — тот же приём, что в V32/V33/V34/V35.
-- Отличие от них: здесь VALIDATE обязан пройти с нулём нарушителей СРАЗУ, а не
-- «когда-нибудь потом руками» — backfill ниже об этом заботится, клампя
-- собственный результат в границы CHECK ДО того, как VALIDATE его увидит.
-- DO-блок оставлен ради единообразия приёма в проекте, а не потому что здесь
-- правда ждём WARNING на проде.
--
-- BACKFILL — то, чего в задании нет, и вот почему он всё равно здесь.
-- На каталоге (100 строк products, проверено тем же прогоном против
-- postgres:14) у 20 строк products.sale_price уже заполнен и меньше price —
-- это ДЕЙСТВУЮЩИЕ сейчас скидки, показанные на витрине СТАРЫМ механизмом
-- (админка пишет sale_price напрямую). Начиная с этой миграции витрина и
-- админка берут salePrice из НОВОГО вычисления (основа × (100 − discount_pct)
-- / 100, см. VariantPriceCalculator), а discount_pct по умолчанию 0 — то есть
-- БЕЗ backfill все 20 существующих скидок молча исчезли бы с витрины в момент
-- выкатки, раньше, чем появится экран для их повторного ввода (тот — этап 3).
-- Это ровно тот класс поломки, который весь этот тикет призван не повторить
-- (см. «ловушка» в задании): поле выглядит рабочим (sale_price всё ещё в
-- базе), а результата не даёт (витрина его больше не читает). Поэтому
-- существующие пары (price, sale_price) конвертируются в discount_pct один
-- раз, здесь же:
--   • берём только строки, где sale_price задан, положителен и меньше price
--     (иначе это не скидка, а мусор — на сегодняшних данных таких нет, но
--     формула не должна падать, если завтра появятся);
--   • процент = 100 − sale_price/price×100, округлённый ВНИЗ (floor) — та же
--     сторона округления, что и в самом калькуляторе: заниженный на дробную
--     часть процент даёт пересчитанную цену чуть ВЫШЕ старой sale_price,
--     никогда ниже, то есть в худшем случае старая скидка после миграции
--     чуть мельче, а не глубже;
--   • LEAST(90, …) — клампит на случай гипотетической старой скидки глубже
--     90%: на сегодняшних 20 строках максимум 60%, но без клампа сама эта
--     UPDATE нарушила бы ck_products_discount_pct ниже.
-- price_source не трогаем — остаётся 'manual' по умолчанию: ни одна из этих
-- строк не была переключена на Ozon (переключателя ещё не существовало),
-- backfill только про то, что уже было ручной скидкой.
-- products.sale_price НЕ очищается: он больше не читается витриной, но
-- удалять чужие данные без явной просьбы — отдельное решение, не этого тикета.
-- =============================================

ALTER TABLE products
    ADD COLUMN price_source VARCHAR(16) NOT NULL DEFAULT 'manual';
ALTER TABLE products
    ADD COLUMN discount_pct INT NOT NULL DEFAULT 0;

ALTER TABLE products
    ADD CONSTRAINT ck_products_price_source
    CHECK (price_source IN ('manual', 'ozon'))
    NOT VALID;

ALTER TABLE products
    ADD CONSTRAINT ck_products_discount_pct
    CHECK (discount_pct BETWEEN 0 AND 90)
    NOT VALID;

-- Backfill идёт ПОСЛЕ ck_products_discount_pct нарочно: NOT VALID уже
-- проверяет каждую новую запись с этого момента (включая эту UPDATE), а
-- LEAST/GREATEST здесь гарантируют, что она сама его не нарушит.
UPDATE products
   SET discount_pct = LEAST(90, GREATEST(0,
           FLOOR(100 - (sale_price * 100.0 / price))::INT))
 WHERE sale_price IS NOT NULL
   AND price IS NOT NULL
   AND price > 0
   AND sale_price > 0
   AND sale_price < price;

DO $$
DECLARE
    offenders BIGINT;
BEGIN
    SELECT count(*) INTO offenders
      FROM products
     WHERE price_source NOT IN ('manual', 'ozon');

    IF offenders = 0 THEN
        ALTER TABLE products VALIDATE CONSTRAINT ck_products_price_source;
    ELSE
        RAISE WARNING 'ck_products_price_source: % строк(и) products вне списка ''manual''/''ozon''; '
                      'правило действует на новые и изменяемые записи, старые не проверены. '
                      'Почините их и выполните ALTER TABLE products VALIDATE CONSTRAINT ck_products_price_source;',
                      offenders;
    END IF;
END $$;

DO $$
DECLARE
    offenders BIGINT;
BEGIN
    SELECT count(*) INTO offenders
      FROM products
     WHERE discount_pct < 0 OR discount_pct > 90;

    IF offenders = 0 THEN
        ALTER TABLE products VALIDATE CONSTRAINT ck_products_discount_pct;
    ELSE
        RAISE WARNING 'ck_products_discount_pct: % строк(и) products со скидкой вне 0..90; '
                      'правило действует на новые и изменяемые записи, старые не проверены. '
                      'Почините их и выполните ALTER TABLE products VALIDATE CONSTRAINT ck_products_discount_pct;',
                      offenders;
    END IF;
END $$;

COMMENT ON COLUMN products.price_source IS
    'manual | ozon. manual — цена берётся из products.price (как раньше); ozon — из marketplace_prices '
    '(buyer_price_kop для source=''ozon''). wildberries сюда намеренно не входит, см. заголовок миграции. '
    'Значение по умолчанию сохраняет для ВСЕХ существующих вариантов ровно старое поведение.';
COMMENT ON COLUMN products.discount_pct IS
    'Скидка в процентах, 0..90 (см. заголовок миграции про 90 как сторож от опечатки, не деловую границу). '
    'Применяется поверх цены источника независимо от price_source. 0 = скидки нет, salePrice не показывается.';

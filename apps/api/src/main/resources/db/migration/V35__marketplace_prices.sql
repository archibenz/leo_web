-- =============================================
-- V35: marketplace_prices — приёмная сторона моста от аналитики (этап 1).
--
-- Источник цены лежит за границей базы сайта: и цена покупателя, и
-- себестоимость живут в базе аналитики (marketing_seller_price,
-- ozon_postings, product_snapshots — этих слов в коде сайта нет ни одного).
-- Аналитика толкает пачками в эту ручку тем же приёмом, которым уже ходит
-- телеграм-бот (см. BotController). Дальше эти цены обслуживают переключатель
-- «цена с маркетплейса» и запрет продажи ниже себестоимости — но это этап 2/3,
-- здесь только приём и хранение.
--
-- Суррогатный id, а не составной PRIMARY KEY (product_id, source): PRIMARY
-- KEY в Postgres требует NOT NULL на всех колонках ключа, а source обязан
-- быть NULL для строк с одной только себестоимостью (см. ниже) — составной
-- ключ с этим полем физически невозможен.
--
-- Уникальность по ВЫРАЖЕНИЮ, а не UNIQUE(product_id, source) — вот почему: у
-- 55 из 87 вариантов нет озоновской пары, и себестоимость на них приходит без
-- source (NULL). Обычный UNIQUE считает каждую строку с source=NULL отдельной
-- от любой другой такой же — NULL ≠ NULL в стандартной проверке уникальности —
-- и повторный приём себестоимости плодил бы дубликаты вместо upsert именно для
-- этих 55 строк.
--
-- Напрашивается UNIQUE ... NULLS NOT DISTINCT, и сначала здесь стояло именно
-- оно. ЭТО БЫЛО ОШИБКОЙ, стоившей десяти минут простоя API 15.09.2026:
-- NULLS NOT DISTINCT появился в PostgreSQL 15, а НА ПРОДЕ PostgreSQL 14.24.
-- Flyway упал с «syntax error at or near "NULLS"», Spring без Flyway не
-- поднялся, /api/health отдавал 502. Витрина при этом отвечала 200 из своего
-- кэша — то есть снаружи поломка была почти не видна.
--
-- Почему не поймали: docker-compose.yml объявляет postgres:16-alpine,
-- корневой CLAUDE.md пишет «PostgreSQL 16», ручной прогон миграций шёл против
-- 16, в тестах Flyway не запускается вовсе, а CI миграции не гоняет. Три
-- уровня проверки, и ни один не знал боевой версии. Проверка была честной и
-- отвечала не на тот вопрос.
--
-- coalesce(source, '') даёт ту же гарантию на 14: две строки без source
-- сравниваются как две пустые строки и конфликтуют, чего и требует контракт.
-- Пустая строка не может встретиться настоящим значением — ck_..._source
-- разрешает только NULL, 'ozon' и 'wildberries'.
--
-- ON CONFLICT к этому индексу не привязан: служба делает чтение-затем-запись
-- через JPA (findByProductIdAndSource[IsNull] → save), и индекс здесь сторож,
-- а не механизм upsert. Поэтому замена ограничения на индекс не потребовала
-- ни строки правки в коде.
--
-- ПИСАТЬ МИГРАЦИИ ПОД PostgreSQL 14, пока версии прода и docker-compose не
-- сведены (lw-qpsc).
--
-- CHECK на «хотя бы одна цена заполнена» пропускает ИМЕННО состояние «есть
-- себестоимость, нет цены покупателя» — это не мусор и не промежуточная
-- строка, а законное значение для тех же 55 вариантов: порог по себестоимости
-- обязан работать и на цене, выставленной руками, без пары с площадкой.
-- Отсутствие ОБЕИХ величин — вот что запрещено, потому что такая строка ничего
-- не несёт и не должна была пройти приёмку выше по стеку (DTO); CHECK здесь —
-- подстраховка на случай прямой записи в обход ручки, а не единственная линия
-- обороны.
--
-- NOT VALID + условная VALIDATE в DO $$ — тот же приём, что в V32/V33/V34.
-- Таблица новая и пустая, поэтому обычный ADD CONSTRAINT ничего бы не уронил
-- сегодня, но это стандартный способ добавлять CHECK в этом проекте, а не
-- разовое решение для этого случая (см. рассуждение в V34).
--
-- product_id — VARCHAR(128) REFERENCES products(id) без ON DELETE, тот же
-- RESTRICT по умолчанию, что у orders (V19) и site_events (V34): ссылка на
-- вариант не должна молча обнулиться.
--
-- checked_at (не capturedAt) — у отправителя нет отметки времени от самой
-- площадки, есть только момент, когда его рутина её спросила. Имя обязано
-- об этом говорить: «captured» читалось бы как «когда площадка назначила
-- цену», а это неправда — застывший источник, отданный из кэша, выглядел бы
-- свежим. NULL для строк с одной себестоимостью: площадку по ним не
-- спрашивали вовсе, проставить момент опроса значило бы утверждать обратное.
--
-- received_at — отдельно от checked_at: когда МЫ приняли строку. Совпадает
-- с checked_at только случайно. Нужен, чтобы отличить «источник давно не
-- опрашивался» (старый checked_at) от «мы давно не получали пачку вовсе»
-- (старый received_at) — это разные неполадки на разных концах моста.
--
-- Приём никогда не стирает: вариант, которого нет в очередной пачке,
-- сохраняет свою строку как есть. Эта таблица физически не даёт способа
-- «пропавший источник» превратить в NULL — стирание было бы отдельным
-- запросом, которого сервис (MarketplacePriceIntakeService) не выполняет.
-- =============================================

CREATE TABLE marketplace_prices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      VARCHAR(128) NOT NULL REFERENCES products(id),
    source          VARCHAR(16),
    buyer_price_kop BIGINT,
    cost_price_kop  BIGINT,
    checked_at      TIMESTAMPTZ,
    received_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Отдельный индекс на product_id не заводим: он покрыт этим уникальным
-- (product_id — ведущая колонка), второй был бы дублем на запись без пользы
-- на чтение.
CREATE UNIQUE INDEX ux_marketplace_prices_product_source
    ON marketplace_prices (product_id, coalesce(source, ''));

ALTER TABLE marketplace_prices
    ADD CONSTRAINT ck_marketplace_prices_source
    CHECK (source IS NULL OR source IN ('ozon', 'wildberries'))
    NOT VALID;

ALTER TABLE marketplace_prices
    ADD CONSTRAINT ck_marketplace_prices_price_present
    CHECK (buyer_price_kop IS NOT NULL OR cost_price_kop IS NOT NULL)
    NOT VALID;

DO $$
DECLARE
    offenders BIGINT;
BEGIN
    SELECT count(*) INTO offenders
      FROM marketplace_prices
     WHERE NOT (source IS NULL OR source IN ('ozon', 'wildberries'));

    IF offenders = 0 THEN
        ALTER TABLE marketplace_prices VALIDATE CONSTRAINT ck_marketplace_prices_source;
    ELSE
        RAISE WARNING 'ck_marketplace_prices_source: % строк(и) marketplace_prices вне списка ''ozon''/''wildberries''; '
                      'правило действует на новые и изменяемые записи, старые не проверены. '
                      'Почините их и выполните ALTER TABLE marketplace_prices VALIDATE CONSTRAINT ck_marketplace_prices_source;',
                      offenders;
    END IF;
END $$;

DO $$
DECLARE
    offenders BIGINT;
BEGIN
    SELECT count(*) INTO offenders
      FROM marketplace_prices
     WHERE buyer_price_kop IS NULL AND cost_price_kop IS NULL;

    IF offenders = 0 THEN
        ALTER TABLE marketplace_prices VALIDATE CONSTRAINT ck_marketplace_prices_price_present;
    ELSE
        RAISE WARNING 'ck_marketplace_prices_price_present: % строк(и) marketplace_prices без единой цены; '
                      'правило действует на новые и изменяемые записи, старые не проверены. '
                      'Почините их и выполните ALTER TABLE marketplace_prices VALIDATE CONSTRAINT ck_marketplace_prices_price_present;',
                      offenders;
    END IF;
END $$;

COMMENT ON TABLE marketplace_prices IS
    'Приёмная сторона моста от базы аналитики (этап 1). Одна строка — пара (вариант, источник цены покупателя) '
    'или себестоимость без источника. Пишет только POST /api/integrations/marketplace-prices, upsert по '
    '(product_id, source), никогда не удаляет — пропавший источник просто перестаёт приходить в пачках.';
COMMENT ON COLUMN marketplace_prices.source IS
    'ozon | wildberries | NULL. NULL — себестоимость пришла из нашего учёта, а не с площадки; приписывать ей '
    'источник значило бы врать подписью. См. ck_marketplace_prices_source.';
COMMENT ON COLUMN marketplace_prices.buyer_price_kop IS
    'Цена, которую платит покупатель на площадке, целыми копейками. NULL, если пачка принесла только себестоимость.';
COMMENT ON COLUMN marketplace_prices.cost_price_kop IS
    'Себестоимость из учёта, целыми копейками. Может быть заполнена без buyer_price_kop — законное состояние '
    'для варианта без пары с площадкой, порог по себестоимости обязан работать и на такой строке.';
COMMENT ON COLUMN marketplace_prices.checked_at IS
    'Момент, когда отправитель СПРОСИЛ площадку — не момент, когда площадка назначила цену (такой отметки у '
    'него нет вовсе). NULL для строк с одной себестоимостью: площадку по ним не спрашивали.';
COMMENT ON COLUMN marketplace_prices.received_at IS
    'Момент, когда эту строку записал сайт. Отдельно от checked_at, чтобы отличить протухший источник от '
    'простоя самого моста.';

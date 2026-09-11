-- =============================================
-- V29: витрина переезжает на базу (этап 1).
--
-- product_models      — модель (карточка на витрине): тексты ru/en, категория,
--                       размеры, фото модели. 20 строк после V30.
-- products            — остаётся единицей продажи и становится ЦВЕТОВЫМ
--                       ВАРИАНТОМ модели: id = wb-<артикул WB>, своя цена,
--                       свой остаток (решение владельца 10.09.2026: остаток
--                       считается по каждому цвету). Все 8 внешних ключей,
--                       смотрящих на products, не меняются.
-- product_sets        — готовые образы; product_set_items — какой именно
--                       вариант (цвет) надет в образе.
-- storefront_sections — медиа-блоки витрины (герой, тизер сетов): тексты,
--                       видео, постеры; status archived хранит блок вместе
--                       с медиа, чтобы его можно было вернуть или клонировать.
--
-- products.price становится NULLABLE: товар без цены = предзаказ (витрина
-- показывает «Предзаказ», чекаут такой товар отклоняет).
-- =============================================

CREATE TABLE product_models (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_key       INT NOT NULL UNIQUE,
    slug            VARCHAR(128) NOT NULL UNIQUE,
    name_ru         VARCHAR(255) NOT NULL,
    name_en         VARCHAR(255) NOT NULL,
    category        VARCHAR(32) NOT NULL,
    desc_ru         TEXT NOT NULL,
    desc_en         TEXT NOT NULL,
    story_ru        TEXT,
    story_en        TEXT,
    composition_ru  TEXT NOT NULL,
    composition_en  TEXT NOT NULL,
    care_ru         TEXT NOT NULL,
    care_en         TEXT NOT NULL,
    sizes           TEXT[] NOT NULL DEFAULT ARRAY['XS','S','M','L','XL'],
    image           VARCHAR(512) NOT NULL,
    gallery         JSONB NOT NULL DEFAULT '[]',
    season          VARCHAR(16),
    nm              BIGINT,
    featured_order  INT,
    lookbook_order  INT,
    sort_order      INT NOT NULL DEFAULT 0,
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE product_models IS 'Модель товара на витрине: тексты, категория, размеры. Цвета — строки products с model_id';
COMMENT ON COLUMN product_models.model_key IS 'Прежний числовой key из products.ts; живёт в корзине и избранном покупателей';
COMMENT ON COLUMN product_models.nm IS 'Артикул модели для сток-снимка и JSON-LD; NULL = артикул первого варианта';

ALTER TABLE products
    ALTER COLUMN price DROP NOT NULL,
    ADD COLUMN model_id       UUID REFERENCES product_models(id) ON DELETE RESTRICT,
    ADD COLUMN color_key      VARCHAR(32),
    ADD COLUMN color_hex      VARCHAR(7),
    ADD COLUMN color_name_ru  VARCHAR(64),
    ADD COLUMN color_name_en  VARCHAR(64),
    ADD COLUMN nm             BIGINT,
    ADD COLUMN sale_price     NUMERIC(12, 2),
    ADD COLUMN sort_order     INT NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX idx_products_nm ON products(nm) WHERE nm IS NOT NULL;
CREATE INDEX idx_products_model ON products(model_id, sort_order);
COMMENT ON COLUMN products.model_id IS 'Модель витрины; NULL у старых тестовых строк';
COMMENT ON COLUMN products.nm IS 'Артикул Wildberries цветового варианта; уникален';
COMMENT ON COLUMN products.sale_price IS 'Цена со скидкой; NULL = скидки нет';

CREATE TABLE product_sets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key         VARCHAR(64) NOT NULL UNIQUE,
    name_ru     VARCHAR(255) NOT NULL,
    name_en     VARCHAR(255) NOT NULL,
    desc_ru     TEXT NOT NULL,
    desc_en     TEXT NOT NULL,
    image       VARCHAR(512) NOT NULL,
    sort_order  INT NOT NULL DEFAULT 0,
    active      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_set_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_id      UUID NOT NULL REFERENCES product_sets(id) ON DELETE CASCADE,
    product_id  VARCHAR(128) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    position    INT NOT NULL DEFAULT 0,
    UNIQUE (set_id, product_id)
);
COMMENT ON COLUMN product_set_items.product_id IS 'Конкретный цветовой вариант, надетый в образе';

CREATE TABLE storefront_sections (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug                VARCHAR(64) NOT NULL UNIQUE,
    layout              VARCHAR(32) NOT NULL,
    status              VARCHAR(16) NOT NULL DEFAULT 'active',
    name_ru             VARCHAR(255) NOT NULL,
    name_en             VARCHAR(255) NOT NULL,
    eyebrow_ru          VARCHAR(255),
    eyebrow_en          VARCHAR(255),
    headline_ru         TEXT,
    headline_en         TEXT,
    body_ru             TEXT,
    body_en             TEXT,
    video_url           VARCHAR(512),
    video_desktop_url   VARCHAR(512),
    poster_url          VARCHAR(512),
    poster_desktop_url  VARCHAR(512),
    sort_order          INT NOT NULL DEFAULT 0,
    archived_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_storefront_sections_status CHECK (status IN ('active', 'archived', 'draft')),
    CONSTRAINT chk_storefront_sections_layout CHECK (layout IN ('hero', 'sets-teaser'))
);
COMMENT ON TABLE storefront_sections IS 'Медиа-блоки витрины. layout — оформление, остальное — содержимое; архив хранит оба, клон наследует layout';

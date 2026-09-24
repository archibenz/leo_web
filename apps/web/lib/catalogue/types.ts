// The storefront as `GET /api/catalog/storefront` hands it over — the shapes the
// pages render, and nothing about how they are fetched. The API omits null
// fields, so everything optional here arrives as `undefined`, exactly as it did
// while the catalogue was a static file.

export type WhiteCat = 'dresses' | 'outerwear' | 'knitwear' | 'tailoring' | 'skirts';

// Single source for the size run, shared by the PDP and the card Quick Add so
// they never drift. Demo sizing — real per-product runs arrive with the catalog.
export const WHITE_SIZES = ['XS', 'S', 'M', 'L', 'XL'] as const;
export type WhiteSize = (typeof WHITE_SIZES)[number];

// `nm` is this colourway's own Wildberries article. Absent means the piece is
// sold under one article whatever the colour; present, it wins over the
// product's, because a buy link that lands on a different colour is a
// customer choosing between the photograph and the page they arrive at.
//
// `price`/`sale` follow the same rule. The marketplace prices per colourway —
// the red balloon skirt is half the ivory one — so a single number on the
// product would be a price the customer cannot buy at whichever colour they
// pick. Absent means the colour is sold at the product's price.
export type WhiteColor = {
  // The colourway's own row in `products` ('wb-<article>'). A bag line carries
  // it, so an order points at the colour the customer picked and not at the
  // model — which is also how a set says which variant is worn in its picture.
  id: string;
  key: string;
  hex: string;
  en: string;
  ru: string;
  nm?: number;
  price?: number;
  sale?: number;
  image?: string;
  gallery?: string[];
};

// Мерка изделия: что меряется сантиметром на самой вещи, по размерам модели.
export const MEASUREMENT_KINDS = ['length', 'chest', 'waist', 'hips', 'sleeve', 'shoulders'] as const;
export type MeasurementKind = (typeof MEASUREMENT_KINDS)[number];
export type ProductMeasurement = {kind: MeasurementKind; values: Record<string, number>};

export type WhiteProduct = {
  // The model's row in `product_models`. `key` remains what the storefront
  // links and sorts by; this is what the editor (stage 2) writes against.
  id: string;
  key: number;
  // Human-readable URL segment — /<locale>/product/<slug>. Transliterated from
  // the Russian name: the audience searches in Russian, and Yandex reads the
  // transliteration as keywords where a query param carried none.
  slug: string;
  en: string;
  ru: string;
  cat: WhiteCat;
  // Absent on preorder-only pieces that have no price anywhere yet (the WB
  // card exists but is not on sale). The card and PDP then say "Предзаказ"
  // instead of a number, and nothing can be added to the bag.
  price?: number;
  sale?: number;
  descEn: string;
  descRu: string;
  // The long read on the product page. `desc*` stays short because it doubles as
  // the meta description, where anything past ~160 characters is truncated;
  // this is where the garment actually gets described — cut, cloth, what it
  // sits with. Search needs text on the page, and a two-line description gave
  // it almost nothing to index.
  storyEn?: string;
  storyRu?: string;
  compositionEn: string;
  compositionRu: string;
  careEn: string;
  careRu: string;
  colors: WhiteColor[];
  // Which sizes this piece is actually cut in. Absent means the full run; a list
  // narrows it, for the pieces where only part of the run is left. Offering a
  // size the warehouse cannot ship is worse than offering one size honestly.
  // Строки, а не WhiteSize: набор правится в форме модели и может выйти за
  // XS–XL (XXL) — WHITE_SIZES остаётся только полным набором по умолчанию.
  sizes?: readonly string[];
  // Мерки ИЗДЕЛИЯ по размерам (п. 15, решение 24.09). Нет — таблицы на
  // карточке нет.
  measurements?: readonly ProductMeasurement[];
  // The product's own presentable photo (real WB garment restyled onto the White
  // studio). Same-origin under images/white/products, so CSP img-src 'self' covers it.
  image: string;
  // Optional extra views OF THE SAME product for the PDP gallery. When absent the
  // PDP shows the single `image` — never other products' shots dressed up as views.
  gallery?: string[];
  // The product's Wildberries article — powers the "buy on Wildberries" links.
  nm: number;
  // Which drop the piece belongs to. Absent means the collection currently in
  // store; 'aw26' is the autumn-winter drop, which is on neither marketplace yet
  // — those pieces reach the site ahead of the warehouse and read as pre-order
  // until stock appears. Marking them lets the storefront be switched over to
  // the new season without having to work out afterwards what belongs to which.
  season?: 'aw26';
  // Where the piece sits on the home page and in the lookbook. Absent keeps it
  // out of that block entirely — the two orderings used to be hardcoded arrays
  // in the components, which is why adding a garment meant editing React.
  featuredOrder?: number;
  lookbookOrder?: number;
};

// One garment in a look. `productId` is the colourway actually worn, so the
// card, the photograph and the line the bag takes are the same thing;
// `productKey` finds the model without a second lookup, and `colourKey` is that
// variant's colour. All three are always there: the API emits an item only when
// it has resolved the variant inside the same payload, and it drops the item
// otherwise — so nothing downstream has to narrow a null here.
export type WhiteSetItem = {productId: string; productKey: number; colourKey: string};

// Curated sets — looks assembled from the real catalogue, sold together or
// piece by piece. The image is the set's editorial mood; the items below it
// are the actual products (each with its own card and sizes).
export type WhiteSet = {
  key: string;
  en: string;
  ru: string;
  descEn: string;
  descRu: string;
  image: string;
  items: WhiteSetItem[];
};

// One line of the home ticker. `ru` is the only field the write side requires;
// everything else narrows who sees the line and where it points.
export type TickerItem = {
  ru: string;
  // Absent means the line does not show on the English site at all — the ru
  // text is never substituted there. See lib/catalogue/select.ts.
  en?: string;
  // Internal path only ('/...'); validated server-side (StorefrontAdminService)
  // so an external address never reaches this field.
  href?: string;
  // 'YYYY-MM-DD', compared as a Moscow-time calendar date, not a UTC instant.
  until?: string;
};

// A media block of the storefront — the hero, the sets teaser, and the home
// ticker. `layout` is the dressing, everything else is the content, which is
// what the editor changes without a deploy.
export type StorefrontSection = {
  id: string;
  slug: string;
  layout: 'hero' | 'sets-teaser' | 'ticker';
  status: 'active' | 'archived' | 'draft';
  nameRu: string;
  nameEn: string;
  eyebrowRu?: string;
  eyebrowEn?: string;
  // Kept as one string with newlines: the hero breaks it into lines itself, so
  // a copy change does not need a component change.
  headlineRu?: string;
  headlineEn?: string;
  bodyRu?: string;
  bodyEn?: string;
  videoUrl?: string;
  videoDesktopUrl?: string;
  posterUrl?: string;
  posterDesktopUrl?: string;
  sortOrder: number;
  // layout='ticker' only; always present there (possibly empty), absent on
  // every other layout's TS literal since nothing there ever reads it.
  items?: TickerItem[];
};

// Строка, чей черновик не прочитался: витрина отдаёт её ОПУБЛИКОВАННОЙ, а
// редактор ставит рядом маркер. «Правки нет» и «правка есть, но её не
// прочитать» — разные вещи; молча показав первое вместо второго, мы заставим
// владельца сделать правку заново поверх той, что уже лежит в базе.
// Приходит только из ручки предпросмотра; в публичном ответе поля нет.
export type StorefrontBrokenDraft = {kind: 'section' | 'model' | 'set'; id: string; key: string; reason: string};

export type Storefront = {
  products: WhiteProduct[];
  sets: WhiteSet[];
  sections: StorefrontSection[];
  brokenDrafts?: StorefrontBrokenDraft[];
};

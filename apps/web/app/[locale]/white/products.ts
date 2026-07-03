// Variant 2 "White" — single source of the demo catalog, shared by the shop
// grid and the PDP (so a card click opens that product, not a hardcoded one).

export type WhiteCat = 'dresses' | 'outerwear' | 'knitwear' | 'tailoring' | 'skirts';

export type WhiteColor = {key: string; hex: string; en: string; ru: string};

export type WhiteProduct = {
  key: number;
  en: string;
  ru: string;
  cat: WhiteCat;
  price: number;
  sale?: number;
  descEn: string;
  descRu: string;
  compositionEn: string;
  compositionRu: string;
  careEn: string;
  careRu: string;
  colors: WhiteColor[];
  // Real photo from the shared gradient-site asset base (/public/images/shop).
  // Served same-origin (CSP img-src 'self'); swapped for editorial model-on-white
  // shots when those land.
  image: string;
};

const IVORY: WhiteColor = {key: 'ivory', hex: '#ece6da', en: 'Ivory', ru: 'Слоновая кость'};
const BLACK: WhiteColor = {key: 'black', hex: '#2b2722', en: 'Black', ru: 'Чёрный'};
const BORDEAUX: WhiteColor = {key: 'bordeaux', hex: '#6e2a2a', en: 'Bordeaux', ru: 'Бордовый'};
const CAMEL: WhiteColor = {key: 'camel', hex: '#b89a6e', en: 'Camel', ru: 'Кэмел'};
const CHARCOAL: WhiteColor = {key: 'charcoal', hex: '#3a3632', en: 'Charcoal', ru: 'Угольный'};
const GREY: WhiteColor = {key: 'grey', hex: '#9a958d', en: 'Grey', ru: 'Серый'};
const SAND: WhiteColor = {key: 'sand', hex: '#d8cdbd', en: 'Sand', ru: 'Песочный'};
const OAT: WhiteColor = {key: 'oat', hex: '#ddd2bf', en: 'Oat', ru: 'Овсяный'};
const NAVY: WhiteColor = {key: 'navy', hex: '#2c3340', en: 'Navy', ru: 'Тёмно-синий'};
const CHAMPAGNE: WhiteColor = {key: 'champagne', hex: '#e3d4bd', en: 'Champagne', ru: 'Шампань'};
const STONE: WhiteColor = {key: 'stone', hex: '#b5ad9f', en: 'Stone', ru: 'Камень'};
const BROWN: WhiteColor = {key: 'brown', hex: '#5c4433', en: 'Brown', ru: 'Коричневый'};

// Real REINASLEO catalogue (WB seller 609562). Names, prices and colours are the
// actual products; each `image` is that real garment restyled onto a clean
// warm-white studio for the White editorial look (real WB photo → reference
// generation). Same-origin JPEGs under images/white/products, CSP img-src 'self'.
export const WHITE_PRODUCTS: WhiteProduct[] = [
  {key: 1, en: 'Linen Maxi Suit', ru: 'Льняной костюм с юбкой макси', cat: 'tailoring', price: 4269, descEn: 'A sleeveless linen vest and a floor-skimming maxi skirt, cut for summer ease. Natural buttons, a defined waist, unlined.', descRu: 'Льняной жилет без рукавов и юбка макси в пол — летняя лёгкость. Натуральные пуговицы, подчёркнутая талия, без подклада.', compositionEn: '100% linen', compositionRu: '100% лён', careEn: 'Machine wash cold, gentle', careRu: 'Деликатная стирка в холодной воде', colors: [IVORY], image: '/images/white/products/p-1008989269.jpg'},
  {key: 2, en: 'Fitted Blazer Coat', ru: 'Пальто-пиджак приталенное', cat: 'outerwear', price: 34900, descEn: 'A demi-season coat cut like a blazer — clean collarless shoulders and a sculpted, buttoned waist. Fully lined.', descRu: 'Демисезонное пальто с кроем пиджака — чистые плечи без воротника и скульптурная талия на пуговицах. На подкладе.', compositionEn: 'Wool blend', compositionRu: 'Шерстяная смесь', careEn: 'Dry clean only', careRu: 'Только химчистка', colors: [SAND, CHARCOAL], image: '/images/white/products/p-795522033.jpg'},
  {key: 3, en: 'Peplum Suit Vest', ru: 'Жилет костюмный с баской', cat: 'tailoring', price: 4466, descEn: 'A classic tailored vest with a peplum flare and a buttoned front. Nipped at the waist, sharp over anything.', descRu: 'Классический костюмный жилет с баской и застёжкой на пуговицы. Приталенный, острый поверх чего угодно.', compositionEn: 'Cotton blend', compositionRu: 'Хлопковая смесь', careEn: 'Dry clean only', careRu: 'Только химчистка', colors: [BROWN, BLACK], image: '/images/white/products/p-962827637.jpg'},
  {key: 4, en: 'Bow Sweatshirt', ru: 'Свитшот с бантиками', cat: 'knitwear', price: 8000, descEn: 'An oversized cotton sweatshirt softened with bow details. Dropped shoulders, ribbed trims, quiet comfort.', descRu: 'Оверсайз-свитшот из хлопка, смягчённый бантиками. Приспущенное плечо, рубчатые края, тихий комфорт.', compositionEn: 'Cotton blend', compositionRu: 'Хлопковая смесь', careEn: 'Machine wash cold', careRu: 'Машинная стирка в холодной воде', colors: [IVORY, OAT], image: '/images/white/products/p-442577291.jpg'},
  {key: 5, en: 'Lace Pencil Skirt', ru: 'Юбка-карандаш с кружевом', cat: 'skirts', price: 30150, descEn: 'A high-waisted pencil skirt finished with fine lace. Tailored through the hip, midi length, quietly formal.', descRu: 'Юбка-карандаш с высокой посадкой и тонким кружевом. Точный крой по бедру, длина миди, сдержанная торжественность.', compositionEn: 'Wool blend with lace', compositionRu: 'Шерстяная смесь с кружевом', careEn: 'Dry clean only', careRu: 'Только химчистка', colors: [IVORY, BLACK], image: '/images/white/products/p-1217805724.jpg'},
  {key: 6, en: 'Peplum Evening Corset', ru: 'Корсет вечерний с баской', cat: 'dresses', price: 2932, descEn: 'A structured evening corset with a peplum hem. A boned bodice and a defined waist, made to be dressed up.', descRu: 'Структурный вечерний корсет с баской. Лиф на косточках и чёткая талия — создан для выхода.', compositionEn: 'Cotton blend', compositionRu: 'Хлопковая смесь', careEn: 'Dry clean only', careRu: 'Только химчистка', colors: [BLACK], image: '/images/white/products/p-675104410.jpg'},
];

// Editorial imagery — model-on-white shots generated for the White variant (the
// REINASLEO Soul), used for the hero, the atelier/lookbook block and as
// alternate PDP gallery views. Same-origin, so CSP img-src 'self' covers them.
export const WHITE_HERO_IMAGE = '/images/white/hero.jpg';
export const WHITE_ATELIER_IMAGE = '/images/white/atelier.jpg';
export const WHITE_EDITORIAL = ['/images/white/editorial-1.jpg', '/images/white/editorial-2.jpg', '/images/white/editorial-3.jpg'];

export function findWhiteProduct(key?: string | number | null): WhiteProduct | undefined {
  if (key == null) return undefined;
  const k = typeof key === 'string' ? Number.parseInt(key, 10) : key;
  if (Number.isNaN(k)) return undefined;
  return WHITE_PRODUCTS.find((p) => p.key === k);
}

export const WHITE_CATS: WhiteCat[] = ['dresses', 'outerwear', 'knitwear', 'tailoring', 'skirts'];

// Single source for the size run, shared by the PDP and the card Quick Add so
// they never drift. Demo sizing — real per-product runs arrive with the catalog.
export const WHITE_SIZES = ['XS', 'S', 'M', 'L', 'XL'] as const;
export type WhiteSize = (typeof WHITE_SIZES)[number];

// Validate a ?cat query value so the shop can be deep-linked/shared. Anything
// unrecognised collapses to 'all' (shared by server page + client showcase).
export function normalizeWhiteCat(value?: string | null): WhiteCat | 'all' {
  return value != null && (WHITE_CATS as string[]).includes(value) ? (value as WhiteCat) : 'all';
}

// Single source of category labels (en/ru), shared by the shop filter chips and
// the server-side <title>, so the two never drift. 'all' is contextual (chip
// reads "All", title reads "Shop"), so each caller supplies that label itself.
const WHITE_CAT_LABELS: Record<WhiteCat, [en: string, ru: string]> = {
  dresses: ['Dresses', 'Платья'],
  outerwear: ['Outerwear', 'Верхняя одежда'],
  knitwear: ['Knitwear', 'Трикотаж'],
  tailoring: ['Tailoring', 'Костюмы'],
  skirts: ['Skirts', 'Юбки'],
};
export function whiteCatLabel(cat: WhiteCat, locale: string): string {
  const [en, ru] = WHITE_CAT_LABELS[cat];
  return locale === 'ru' ? ru : en;
}

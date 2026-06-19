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

export const WHITE_PRODUCTS: WhiteProduct[] = [
  {key: 1, en: 'Silk Column Dress', ru: 'Шёлковое платье-колонна', cat: 'dresses', price: 24500, descEn: 'A fluid floor-length silhouette in matte silk. Bias-cut, unlined, with a concealed side zip. Designed to move quietly.', descRu: 'Текучий силуэт в пол из матового шёлка. Косой крой, без подклада, скрытая боковая молния. Создано двигаться тихо.', compositionEn: '100% mulberry silk', compositionRu: '100% тутовый шёлк', careEn: 'Dry clean only', careRu: 'Только химчистка', colors: [IVORY, BLACK, BORDEAUX], image: '/images/shop/column-dress.jpg'},
  {key: 2, en: 'Sculpted Wool Coat', ru: 'Шерстяное пальто', cat: 'outerwear', price: 32900, descEn: 'A structured wool coat with clean shoulders and a softly belted waist. Fully lined, falling to mid-calf.', descRu: 'Структурное шерстяное пальто с чистой линией плеч и мягким поясом. На подкладе, длина миди.', compositionEn: '100% virgin wool', compositionRu: '100% натуральная шерсть', careEn: 'Dry clean only', careRu: 'Только химчистка', colors: [CAMEL, CHARCOAL, BLACK], image: '/images/shop/wool-coat.jpg'},
  {key: 3, en: 'Tailored Trousers', ru: 'Брюки прямого кроя', cat: 'tailoring', price: 14900, sale: 11900, descEn: 'High-waisted trousers with a pressed crease and a straight leg. Cut from a fluid wool twill.', descRu: 'Брюки с высокой посадкой, заутюженной стрелкой и прямой штаниной. Из текучего шерстяного твила.', compositionEn: 'Wool twill', compositionRu: 'Шерстяной твил', careEn: 'Dry clean only', careRu: 'Только химчистка', colors: [BLACK, GREY, SAND], image: '/images/shop/editorial-clean.jpg'},
  {key: 4, en: 'Cashmere Knit', ru: 'Кашемировый джемпер', cat: 'knitwear', price: 19800, descEn: 'A relaxed crew-neck knit in pure cashmere. Ribbed trims and dropped shoulders — quietly warm.', descRu: 'Свободный джемпер с круглым вырезом из чистого кашемира. Рубчатые края и приспущенное плечо — тихое тепло.', compositionEn: '100% cashmere', compositionRu: '100% кашемир', careEn: 'Hand wash cold', careRu: 'Ручная стирка в холодной воде', colors: [OAT, GREY, BORDEAUX], image: '/images/shop/knit-cozy.jpg'},
  {key: 5, en: 'Pleated Midi Skirt', ru: 'Плиссированная юбка миди', cat: 'skirts', price: 16400, descEn: 'A finely pleated midi skirt that moves with you. Elasticated waist, matte finish, midi length.', descRu: 'Тонко плиссированная юбка миди, что движется с вами. Эластичный пояс, матовая фактура, длина миди.', compositionEn: 'Recycled polyester', compositionRu: 'Переработанный полиэстер', careEn: 'Machine wash cold', careRu: 'Машинная стирка в холодной воде', colors: [BLACK, IVORY], image: '/images/shop/silk-shimmer.jpg'},
  {key: 6, en: 'Structured Blazer', ru: 'Структурный блейзер', cat: 'tailoring', price: 27200, descEn: 'A single-breasted blazer with sharp lapels and a nipped waist. Lined, with functional pockets.', descRu: 'Однобортный блейзер с чёткими лацканами и приталенным силуэтом. На подкладе, с функциональными карманами.', compositionEn: 'Wool blend', compositionRu: 'Шерстяная смесь', careEn: 'Dry clean only', careRu: 'Только химчистка', colors: [BLACK, CAMEL, NAVY], image: '/images/shop/blazer.jpg'},
  {key: 7, en: 'Bias Slip Dress', ru: 'Платье-комбинация', cat: 'dresses', price: 18900, descEn: 'A bias-cut slip dress in liquid satin. Adjustable straps, a low back and a floor-skimming hem.', descRu: 'Платье-комбинация косого кроя из струящегося сатина. Регулируемые бретели, открытая спина, длина в пол.', compositionEn: 'Liquid satin', compositionRu: 'Струящийся сатин', careEn: 'Dry clean only', careRu: 'Только химчистка', colors: [CHAMPAGNE, BLACK, BORDEAUX], image: '/images/shop/silk-camisole.jpg'},
  {key: 8, en: 'Belted Trench', ru: 'Тренч с поясом', cat: 'outerwear', price: 34500, descEn: 'A classic trench in water-resistant cotton gabardine. Storm flap, belted waist, knee length.', descRu: 'Классический тренч из водоотталкивающего хлопкового габардина. Кокетка, пояс, длина до колена.', compositionEn: 'Cotton gabardine', compositionRu: 'Хлопковый габардин', careEn: 'Machine wash cold', careRu: 'Машинная стирка в холодной воде', colors: [SAND, STONE, BLACK], image: '/images/shop/editorial-outer.jpg'},
  {key: 9, en: 'Ribbed Cardigan', ru: 'Кардиган в рубчик', cat: 'knitwear', price: 17600, sale: 13200, descEn: 'A fine-gauge ribbed cardigan with mother-of-pearl buttons. Slim through the body, cropped at the hip.', descRu: 'Кардиган тонкой вязки в рубчик с перламутровыми пуговицами. Приталенный, укороченный по бедру.', compositionEn: 'Fine-gauge wool', compositionRu: 'Шерсть тонкой вязки', careEn: 'Hand wash cold', careRu: 'Ручная стирка в холодной воде', colors: [OAT, CHARCOAL, BORDEAUX], image: '/images/shop/turtleneck.jpg'},
];

// Editorial imagery from the shared gradient asset base — used for the hero, the
// atelier/lookbook block and as alternate PDP gallery views. Same-origin (CSP).
export const WHITE_HERO_IMAGE = '/images/shop/editorial-alt.jpg';
export const WHITE_ATELIER_IMAGE = '/images/shop/full-figure.jpg';
export const WHITE_EDITORIAL = ['/images/shop/editorial-clean.jpg', '/images/shop/full-figure.jpg', '/images/shop/bolero.jpg'];

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

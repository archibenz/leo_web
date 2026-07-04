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
  // The product's own presentable photo (real WB garment restyled onto the White
  // studio). Same-origin under images/white/products, so CSP img-src 'self' covers it.
  image: string;
  // Optional extra views OF THE SAME product for the PDP gallery. When absent the
  // PDP shows the single `image` — never other products' shots dressed up as views.
  gallery?: string[];
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
const ROSE: WhiteColor = {key: 'rose', hex: '#d9aca4', en: 'Rose', ru: 'Розовый'};

// Real REINASLEO catalogue (WB seller 609562). Names, prices and colours are the
// actual products; each `image` is that real garment restyled onto a clean
// warm-white studio for the White editorial look (real WB photo → reference
// generation). Same-origin JPEGs under images/white/products, CSP img-src 'self'.
export const WHITE_PRODUCTS: WhiteProduct[] = [
  {key: 1, en: 'Linen Maxi Suit', ru: 'Льняной костюм с юбкой макси', cat: 'tailoring', price: 4269, descEn: 'A sleeveless linen vest and a floor-skimming maxi skirt, cut for summer ease. Natural buttons, a defined waist, unlined.', descRu: 'Льняной жилет без рукавов и юбка макси в пол — летняя лёгкость. Натуральные пуговицы, подчёркнутая талия, без подклада.', compositionEn: '100% linen', compositionRu: '100% лён', careEn: 'Machine wash cold, gentle', careRu: 'Деликатная стирка в холодной воде', colors: [IVORY], image: '/images/white/products/p-1008989269.jpg', gallery: ['/images/white/products/p-1008989269-2.jpg']},
  {key: 2, en: 'Fitted Blazer Coat', ru: 'Пальто-пиджак приталенное', cat: 'outerwear', price: 34900, descEn: 'A demi-season coat cut like a blazer — clean collarless shoulders and a sculpted, buttoned waist. Fully lined.', descRu: 'Демисезонное пальто с кроем пиджака — чистые плечи без воротника и скульптурная талия на пуговицах. На подкладе.', compositionEn: 'Wool blend', compositionRu: 'Шерстяная смесь', careEn: 'Dry clean only', careRu: 'Только химчистка', colors: [SAND, CHARCOAL], image: '/images/white/products/p-795522033.jpg', gallery: ['/images/white/products/p-795522033-2.jpg']},
  {key: 3, en: 'Peplum Suit Vest', ru: 'Жилет костюмный с баской', cat: 'tailoring', price: 4466, descEn: 'A classic tailored vest with a peplum flare and a buttoned front. Nipped at the waist, sharp over anything.', descRu: 'Классический костюмный жилет с баской и застёжкой на пуговицы. Приталенный, острый поверх чего угодно.', compositionEn: 'Cotton blend', compositionRu: 'Хлопковая смесь', careEn: 'Dry clean only', careRu: 'Только химчистка', colors: [BROWN, BLACK], image: '/images/white/products/p-962827637.jpg', gallery: ['/images/white/products/p-962827637-2.jpg']},
  {key: 4, en: 'Bow Sweatshirt', ru: 'Свитшот с бантиками', cat: 'knitwear', price: 8000, descEn: 'An oversized cotton sweatshirt softened with bow details. Dropped shoulders, ribbed trims, quiet comfort.', descRu: 'Оверсайз-свитшот из хлопка, смягчённый бантиками. Приспущенное плечо, рубчатые края, тихий комфорт.', compositionEn: 'Cotton blend', compositionRu: 'Хлопковая смесь', careEn: 'Machine wash cold', careRu: 'Машинная стирка в холодной воде', colors: [IVORY, OAT], image: '/images/white/products/p-442577291.jpg', gallery: ['/images/white/products/p-442577291-2.jpg']},
  {key: 5, en: 'Lace Pencil Skirt', ru: 'Юбка-карандаш с кружевом', cat: 'skirts', price: 30150, descEn: 'A high-waisted pencil skirt finished with fine lace. Tailored through the hip, midi length, quietly formal.', descRu: 'Юбка-карандаш с высокой посадкой и тонким кружевом. Точный крой по бедру, длина миди, сдержанная торжественность.', compositionEn: 'Wool blend with lace', compositionRu: 'Шерстяная смесь с кружевом', careEn: 'Dry clean only', careRu: 'Только химчистка', colors: [IVORY, BLACK], image: '/images/white/products/p-1217805724.jpg'},
  {key: 6, en: 'Peplum Evening Corset', ru: 'Корсет вечерний с баской', cat: 'dresses', price: 2932, descEn: 'A structured evening corset with a peplum hem. A boned bodice and a defined waist, made to be dressed up.', descRu: 'Структурный вечерний корсет с баской. Лиф на косточках и чёткая талия — создан для выхода.', compositionEn: 'Cotton blend', compositionRu: 'Хлопковая смесь', careEn: 'Dry clean only', careRu: 'Только химчистка', colors: [BLACK], image: '/images/white/products/p-675104410.jpg', gallery: ['/images/white/products/p-675104410-2.jpg']},
  {key: 7, en: 'Draped Harem Trousers', ru: 'Брюки алладины', cat: 'tailoring', price: 2927, descEn: 'Softly draped harem trousers with a relaxed fall and a clean waist. Easy tailoring for every day.', descRu: 'Мягко драпированные брюки алладины со свободным силуэтом и чистой талией. Лёгкий тайлоринг на каждый день.', compositionEn: 'Viscose blend', compositionRu: 'Вискозная смесь', careEn: 'Machine wash cold', careRu: 'Машинная стирка в холодной воде', colors: [SAND, BLACK], image: '/images/white/products/p-962783109.jpg', gallery: ['/images/white/products/p-962783109-2.jpg']},
  {key: 8, en: 'Satin Balloon Skirt', ru: 'Юбка баллон атласная', cat: 'skirts', price: 2565, descEn: 'A satin balloon mini with built-in shorts and a rounded volume. Matte sheen, quiet movement.', descRu: 'Атласная юбка-баллон мини с шортами и округлым объёмом. Матовый блеск, тихое движение.', compositionEn: 'Satin', compositionRu: 'Атлас', careEn: 'Machine wash cold', careRu: 'Машинная стирка в холодной воде', colors: [SAND, CHAMPAGNE], image: '/images/white/products/p-371980450.jpg', gallery: ['/images/white/products/p-371980450-2.jpg']},
  {key: 9, en: 'Lace Oversized Shirt', ru: 'Рубашка оверсайз с кружевом', cat: 'dresses', price: 8326, descEn: 'An oversized shirt softened with lace panels. Relaxed shoulders, a fluid drape, quietly romantic.', descRu: 'Оверсайз-рубашка, смягчённая кружевными вставками. Свободные плечи, текучий крой, тихая романтика.', compositionEn: 'Cotton with lace', compositionRu: 'Хлопок с кружевом', careEn: 'Hand wash cold', careRu: 'Ручная стирка в холодной воде', colors: [SAND, ROSE, GREY, BLACK], image: '/images/white/products/p-1113526969.jpg', gallery: ['/images/white/products/p-1113526969-2.jpg']},
  {key: 10, en: 'Suede Skort', ru: 'Юбка-шорты замшевая', cat: 'skirts', price: 2922, descEn: 'A suede mini skort — the ease of shorts under the line of a skirt. Soft hand, clean hem.', descRu: 'Замшевая юбка-шорты — лёгкость шорт под линией юбки. Мягкая фактура, чистый низ.', compositionEn: 'Suede', compositionRu: 'Замша', careEn: 'Dry clean only', careRu: 'Только химчистка', colors: [SAND, BROWN], image: '/images/white/products/p-1143078000.jpg', gallery: ['/images/white/products/p-1143078000-2.jpg']},
  {key: 11, en: 'Long Belted Coat', ru: 'Пальто оверсайз с поясом', cat: 'outerwear', price: 34900, descEn: 'A long oversized demi-season coat with a self-tie belt. Dropped shoulders, a deep collar, floor-skimming.', descRu: 'Длинное оверсайз-пальто демисезона с поясом. Приспущенное плечо, глубокий воротник, длина в пол.', compositionEn: 'Wool blend', compositionRu: 'Шерстяная смесь', careEn: 'Dry clean only', careRu: 'Только химчистка', colors: [SAND, CAMEL], image: '/images/white/products/p-100797221.jpg', gallery: ['/images/white/products/p-100797221-2.jpg']},
  {key: 12, en: 'Ribbed Slit Dress', ru: 'Платье лапша с разрезом', cat: 'dresses', price: 632, descEn: 'A long ribbed knit dress that skims the body, opened by a single side slit. Second-skin soft.', descRu: 'Длинное платье в рубчик, что скользит по фигуре, с одним боковым разрезом. Мягкое как вторая кожа.', compositionEn: 'Ribbed viscose', compositionRu: 'Вискоза в рубчик', careEn: 'Hand wash cold', careRu: 'Ручная стирка в холодной воде', colors: [OAT, GREY], image: '/images/white/products/p-192510012.jpg', gallery: ['/images/white/products/p-192510012-2.jpg']},
  {key: 13, en: 'Striped Belted Coat', ru: 'Пальто в полоску с поясом', cat: 'outerwear', price: 34900, descEn: 'A long oversized coat in a fine tonal stripe, closed with a belt. Considered ease over anything.', descRu: 'Длинное оверсайз-пальто в тонкую тональную полоску, на поясе. Продуманная лёгкость поверх чего угодно.', compositionEn: 'Wool blend', compositionRu: 'Шерстяная смесь', careEn: 'Dry clean only', careRu: 'Только химчистка', colors: [SAND, CHARCOAL], image: '/images/white/products/p-814720607.jpg', gallery: ['/images/white/products/p-814720607-2.jpg']},
  {key: 14, en: 'Spring Kimono Coat', ru: 'Пальто кимоно весеннее', cat: 'outerwear', price: 34900, descEn: 'A short kimono-cut coat for spring — wide sleeves, a wrap front, no fuss. Light layering.', descRu: 'Короткое пальто кроя кимоно для весны — широкий рукав, запа́х, без суеты. Лёгкий слой.', compositionEn: 'Wool blend', compositionRu: 'Шерстяная смесь', careEn: 'Dry clean only', careRu: 'Только химчистка', colors: [SAND], image: '/images/white/products/p-801438197.jpg', gallery: ['/images/white/products/p-801438197-2.jpg']},
  {key: 15, en: 'Draped Kimono Coat', ru: 'Пальто кимоно драповое', cat: 'outerwear', price: 34900, descEn: 'A draped wool kimono coat with a belt and a fluid fall. Architectural calm, cut to move.', descRu: 'Драповое пальто кимоно с поясом и текучим силуэтом. Архитектурное спокойствие, крой в движении.', compositionEn: 'Drape wool', compositionRu: 'Драп', careEn: 'Dry clean only', careRu: 'Только химчистка', colors: [CAMEL, CHARCOAL], image: '/images/white/products/p-795627344.jpg', gallery: ['/images/white/products/p-795627344-2.jpg']},
  {key: 16, en: 'Short Kimono Coat', ru: 'Пальто кимоно короткое', cat: 'outerwear', price: 34900, descEn: 'A cropped kimono coat with clean lines and a soft shoulder. The quiet finish to a look.', descRu: 'Укороченное пальто кимоно с чистыми линиями и мягким плечом. Тихое завершение образа.', compositionEn: 'Wool blend', compositionRu: 'Шерстяная смесь', careEn: 'Dry clean only', careRu: 'Только химчистка', colors: [SAND], image: '/images/white/products/p-795657866.jpg', gallery: ['/images/white/products/p-795657866-2.jpg']},
  {key: 17, en: 'Evening Dress', ru: 'Платье вечернее', cat: 'dresses', price: 1375, descEn: 'An occasion dress cut close and quiet. A clean neckline, a defined waist, made for evening.', descRu: 'Вечернее платье приталенного, сдержанного кроя. Чистая линия выреза, чёткая талия — для вечера.', compositionEn: 'Crepe', compositionRu: 'Креп', careEn: 'Dry clean only', careRu: 'Только химчистка', colors: [BLACK, BORDEAUX], image: '/images/white/products/p-192521903.jpg', gallery: ['/images/white/products/p-192521903-2.jpg']},
  {key: 18, en: 'Lace Peplum Vest', ru: 'Жилет с баской и кружевом', cat: 'tailoring', price: 33400, descEn: 'A tailored peplum vest finished with lace. The sharpness of tailoring, softened at the edge.', descRu: 'Костюмный жилет с баской, завершённый кружевом. Острота тайлоринга, смягчённая по краю.', compositionEn: 'Wool blend with lace', compositionRu: 'Шерстяная смесь с кружевом', careEn: 'Dry clean only', careRu: 'Только химчистка', colors: [IVORY, BROWN, BLACK], image: '/images/white/products/p-1224761706.jpg'},
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
  productKeys: number[];
};

export const WHITE_SETS: WhiteSet[] = [
  {key: 'office', en: 'The Office Edit', ru: 'В офис', descEn: 'Sharp tailoring that works the whole week: the peplum vest over draped trousers, the striped coat on top.', descRu: 'Строгий тайлоринг на всю неделю: жилет с баской поверх брюк алладинов, сверху — пальто в полоску.', image: '/images/white/editorial-2.jpg', productKeys: [3, 7, 13]},
  {key: 'summer', en: 'Summer in the City', ru: 'Лето в городе', descEn: 'Linen for the heat: the maxi suit, a lace shirt thrown over, the suede skort for lighter days.', descRu: 'Лён для жары: костюм с юбкой макси, поверх — рубашка с кружевом, на лёгкие дни — замшевая юбка-шорты.', image: '/images/white/atelier.jpg', productKeys: [1, 9, 10]},
  {key: 'evening', en: 'The Evening Out', ru: 'Вечерний выход', descEn: 'The corset with the lace pencil skirt, the fitted coat over the shoulders on the way home.', descRu: 'Корсет с юбкой-карандашом в кружеве, по дороге домой — приталенное пальто на плечи.', image: '/images/white/editorial-1.jpg', productKeys: [6, 5, 2]},
  {key: 'everyday', en: 'Everyday Ease', ru: 'На каждый день', descEn: 'The bow sweatshirt with the balloon skirt, the short kimono coat when it cools down.', descRu: 'Свитшот с бантиками и юбка-баллон, когда холодает — короткое пальто кимоно.', image: '/images/white/editorial-3.jpg', productKeys: [4, 8, 16]},
];

export function findWhiteSet(key?: string | null): WhiteSet | undefined {
  return WHITE_SETS.find((s) => s.key === key);
}

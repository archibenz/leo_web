// Variant 2 "White" — single source of the demo catalog, shared by the shop
// grid and the PDP (so a card click opens that product, not a hardcoded one).

export type WhiteCat = 'dresses' | 'outerwear' | 'knitwear' | 'tailoring' | 'skirts';

export type WhiteProduct = {
  key: number;
  en: string;
  ru: string;
  cat: WhiteCat;
  price: number;
  sale?: number;
  descEn: string;
  descRu: string;
};

export const WHITE_PRODUCTS: WhiteProduct[] = [
  {key: 1, en: 'Silk Column Dress', ru: 'Шёлковое платье-колонна', cat: 'dresses', price: 24500, descEn: 'A fluid floor-length silhouette in matte silk. Bias-cut, unlined, with a concealed side zip. Designed to move quietly.', descRu: 'Текучий силуэт в пол из матового шёлка. Косой крой, без подклада, скрытая боковая молния. Создано двигаться тихо.'},
  {key: 2, en: 'Sculpted Wool Coat', ru: 'Шерстяное пальто', cat: 'outerwear', price: 32900, descEn: 'A structured wool coat with clean shoulders and a softly belted waist. Fully lined, falling to mid-calf.', descRu: 'Структурное шерстяное пальто с чистой линией плеч и мягким поясом. На подкладе, длина миди.'},
  {key: 3, en: 'Tailored Trousers', ru: 'Брюки прямого кроя', cat: 'tailoring', price: 14900, sale: 11900, descEn: 'High-waisted trousers with a pressed crease and a straight leg. Cut from a fluid wool twill.', descRu: 'Брюки с высокой посадкой, заутюженной стрелкой и прямой штаниной. Из текучего шерстяного твила.'},
  {key: 4, en: 'Cashmere Knit', ru: 'Кашемировый джемпер', cat: 'knitwear', price: 19800, descEn: 'A relaxed crew-neck knit in pure cashmere. Ribbed trims and dropped shoulders — quietly warm.', descRu: 'Свободный джемпер с круглым вырезом из чистого кашемира. Рубчатые края и приспущенное плечо — тихое тепло.'},
  {key: 5, en: 'Pleated Midi Skirt', ru: 'Плиссированная юбка миди', cat: 'skirts', price: 16400, descEn: 'A finely pleated midi skirt that moves with you. Elasticated waist, matte finish, midi length.', descRu: 'Тонко плиссированная юбка миди, что движется с вами. Эластичный пояс, матовая фактура, длина миди.'},
  {key: 6, en: 'Structured Blazer', ru: 'Структурный блейзер', cat: 'tailoring', price: 27200, descEn: 'A single-breasted blazer with sharp lapels and a nipped waist. Lined, with functional pockets.', descRu: 'Однобортный блейзер с чёткими лацканами и приталенным силуэтом. На подкладе, с функциональными карманами.'},
  {key: 7, en: 'Bias Slip Dress', ru: 'Платье-комбинация', cat: 'dresses', price: 18900, descEn: 'A bias-cut slip dress in liquid satin. Adjustable straps, a low back and a floor-skimming hem.', descRu: 'Платье-комбинация косого кроя из струящегося сатина. Регулируемые бретели, открытая спина, длина в пол.'},
  {key: 8, en: 'Belted Trench', ru: 'Тренч с поясом', cat: 'outerwear', price: 34500, descEn: 'A classic trench in water-resistant cotton gabardine. Storm flap, belted waist, knee length.', descRu: 'Классический тренч из водоотталкивающего хлопкового габардина. Кокетка, пояс, длина до колена.'},
  {key: 9, en: 'Ribbed Cardigan', ru: 'Кардиган в рубчик', cat: 'knitwear', price: 17600, sale: 13200, descEn: 'A fine-gauge ribbed cardigan with mother-of-pearl buttons. Slim through the body, cropped at the hip.', descRu: 'Кардиган тонкой вязки в рубчик с перламутровыми пуговицами. Приталенный, укороченный по бедру.'},
];

export function findWhiteProduct(key?: string | number | null): WhiteProduct | undefined {
  if (key == null) return undefined;
  const k = typeof key === 'string' ? Number.parseInt(key, 10) : key;
  if (Number.isNaN(k)) return undefined;
  return WHITE_PRODUCTS.find((p) => p.key === k);
}

export const WHITE_CATS: WhiteCat[] = ['dresses', 'outerwear', 'knitwear', 'tailoring', 'skirts'];

// Validate a ?cat query value so the shop can be deep-linked/shared. Anything
// unrecognised collapses to 'all' (shared by server page + client showcase).
export function normalizeWhiteCat(value?: string | null): WhiteCat | 'all' {
  return value != null && (WHITE_CATS as string[]).includes(value) ? (value as WhiteCat) : 'all';
}

import type {WhiteCat, WhiteColor, WhiteProduct, WhiteSet} from './types';

export {WHITE_SIZES} from './types';
export type {WhiteSize} from './types';

// Чистые выборки по витрине: ни запросов, ни React. Каталог приходит
// параметром, поэтому одна и та же функция обслуживает и страницу на базе, и
// тест на фикстуре.

export function findProductByKey(products: readonly WhiteProduct[], key?: string | number | null): WhiteProduct | undefined {
  if (key == null) return undefined;
  const k = typeof key === 'string' ? Number.parseInt(key, 10) : key;
  if (Number.isNaN(k)) return undefined;
  return products.find((p) => p.key === k);
}

export function findProductBySlug(products: readonly WhiteProduct[], slug?: string | null): WhiteProduct | undefined {
  if (!slug) return undefined;
  return products.find((p) => p.slug === slug);
}

export function findSet(sets: readonly WhiteSet[], key?: string | null): WhiteSet | undefined {
  return sets.find((s) => s.key === key);
}

// The colour worn in this look, falling back to the garment's default. Used for
// the photograph on the card and for the line the bag takes, so what is shown,
// what is ordered and what is in the picture are the same thing. A look shot in
// a brown coat and a sand skirt was otherwise listed as a black coat and a
// black skirt — the same two garments, but not this outfit.
export function setColour(set: WhiteSet, product: WhiteProduct): WhiteColor {
  const item = set.items.find((it) => it.productKey === product.key);
  const worn = item && product.colors.find((c) => c.id === item.productId);
  return worn ?? product.colors[0]!;
}

// Canonical product path. Everything that links to a garment goes through this
// so the slug never has to be assembled by hand at a call site.
export function whiteProductHref(locale: string, product: Pick<WhiteProduct, 'slug'>): string {
  return `/${locale}/product/${product.slug}`;
}

// Nothing here knows what is on the shelf. The real count lives at Wildberries,
// so the site cannot honestly offer a garment for its own bag — it would take an
// order it may not be able to fill. Until stock is wired up (the Ozon
// integration), every piece reads as unavailable and Wildberries is the one
// route to buying it.
//
// This is the single switch: give it a real source and the whole storefront —
// product page, quick add, markup — starts telling the truth at once.
export function whiteInStock(_product: Pick<WhiteProduct, 'key'>): boolean {
  return false;
}

// Pieces that have gone from the marketplaces too — sold out at Wildberries and
// not on Ozon. They keep their page (the photographs and the search listing are
// worth having) but there is nowhere to send a buyer, so the page offers to take
// a pre-order instead of pretending a route exists. Add a key here when the last
// one leaves the warehouse.
const WHITE_OFF_MARKETPLACES = new Set<number>([]);

// Three honest states, in the order the storefront checks them:
//   'site'        — we hold it and the bag can take it
//   'marketplace' — we do not, but Wildberries or Ozon does
//   'none'        — nowhere; the page offers a pre-order
// Everything that decides between a bag button, a marketplace button and a
// pre-order form reads this one function, so the three can never disagree.
export type WhiteAvailability = 'site' | 'marketplace' | 'none';

export function whiteAvailability(
  product: Pick<WhiteProduct, 'key' | 'nm' | 'price'>,
  // `onWb` comes from the live marketplace snapshot; it defaults to true so a
  // caller without it keeps the old behaviour of trusting the article number.
  opts?: {onOzon?: boolean; onWb?: boolean},
): WhiteAvailability {
  if (whiteInStock(product)) return 'site';
  // No price anywhere means the WB card is a stub that is not on sale yet —
  // there is nowhere to send a buyer, whatever the article number says.
  if (product.price == null) return 'none';
  if (opts?.onOzon) return 'marketplace';
  const wb = opts?.onWb ?? true;
  if (wb && product.nm && !WHITE_OFF_MARKETPLACES.has(product.key)) return 'marketplace';
  return 'none';
}

// What the colourway in front of the customer costs. A colour either carries
// its own pricing or is sold at the product's — the two are never mixed, since
// a product-level sale struck against a colour's own price would advertise a
// discount nobody offered.
export function whitePrice(product: Pick<WhiteProduct, 'price' | 'sale'>, colour?: WhiteColor): {price?: number; sale?: number} {
  if (colour?.price != null) return {price: colour.price, sale: colour.sale};
  return {price: product.price, sale: product.sale};
}

export function whiteEffectivePrice(product: Pick<WhiteProduct, 'price' | 'sale'>, colour?: WhiteColor): number | undefined {
  const {price, sale} = whitePrice(product, colour);
  return sale ?? price;
}

// The spread across colourways, for the grid card and the sort — neither knows
// which colour the customer will pick. `varies` is what turns "5 000 ₽" into
// "от 5 000 ₽": quoting one colour's price for all of them is how a card ends
// up promising half of what the basket then charges.
export function whitePriceRange(product: Pick<WhiteProduct, 'price' | 'sale' | 'colors'>): {min?: number; max?: number; varies: boolean} {
  const values = product.colors
    .map((c) => whiteEffectivePrice(product, c))
    .filter((v): v is number => v != null);
  if (!values.length) return {varies: false};
  const min = Math.min(...values);
  const max = Math.max(...values);
  return {min, max, varies: min !== max};
}

export const WHITE_CATS: WhiteCat[] = ['dresses', 'outerwear', 'knitwear', 'tailoring', 'skirts'];

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

// The second marketplace. Wildberries carries the whole range and its URL is a
// formula over the article number; Ozon carries a handful of pieces shipped from
// our own warehouse (FBS), so the links are an explicit list — a garment gets an
// Ozon button only once its card actually exists there.
//
// Ozon attributes external traffic by `utm_campaign`, and only when the value
// opens with the seller's own prefix. Without it the visitor still lands on the
// card and the sale still happens — it simply never shows up in Аналитика →
// Внешний трафик, so nobody can tell the site brought it.
//
// Deliberately a constant and not an env var. It is public (it travels in every
// link), identical everywhere, and never rotates — while a build that forgot to
// source the env would keep working and quietly stop being counted, which is the
// exact failure this prefix exists to prevent.
const VENDOR_PREFIX = 'vendor_org_806467';

// Product key (see app/[locale]/products.ts) → the card's address on Ozon.
// A card lives at /product/<sku>/ — Ozon expands the bare number into the full
// slug address itself, so the SKU straight out of the Seller API is enough.
//
// Ozon splits a garment into one card per colour, while a product here carries
// the whole palette. Each link therefore points at the black card: of the
// colours on the shelf it is the one every one of these three actually has.
// Per-colour links are the eventual shape — once more than one colour per
// garment carries stock, which today it does not.
//
// Taken from /v3/product/list on 2026-08-13, filtered to colours with stock.
const OZON_LINKS: Record<number, string> = {
  // Жилет костюмный с баской — чёрный, 7 размеров
  3: 'https://www.ozon.ru/product/5293519900/',
  // Жилет с баской и кружевом — чёрный, 7 размеров
  18: 'https://www.ozon.ru/product/5280181693/',
  // Юбка-карандаш с кружевом — чёрная, 4 размера
  5: 'https://www.ozon.ru/product/5282174758/',
};

function isOzonUrl(url: URL): boolean {
  return url.protocol === 'https:' && (url.hostname === 'ozon.ru' || url.hostname.endsWith('.ozon.ru'));
}

// Prefix first, campaign name after — the shape Ozon's own builder produces.
function campaignValue(name: string): string {
  return `${VENDOR_PREFIX}_${name}`;
}

export function buildOzonLink(raw: string, {campaign, content}: {campaign: string; content?: string}): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  // A typo in the list would otherwise put a foreign domain behind a button
  // that says "buy on Ozon" — refuse instead of rendering it.
  if (!isOzonUrl(url)) return null;
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith('utm_')) url.searchParams.delete(key);
  }
  url.searchParams.set('utm_source', 'reinasleo.com');
  url.searchParams.set('utm_medium', 'website');
  url.searchParams.set('utm_campaign', campaignValue(campaign));
  if (content) url.searchParams.set('utm_content', content);
  return url.toString();
}

// `utm_content` carries the slug so the report separates the garments instead of
// lumping every click under one site-wide campaign.
export function ozonProductUrl(product: {key: number; slug: string}): string | null {
  const raw = OZON_LINKS[product.key];
  if (!raw) return null;
  return buildOzonLink(raw, {campaign: 'product', content: product.slug});
}

export function hasOzonListing(key: number): boolean {
  return Boolean(OZON_LINKS[key]);
}

// Which garments are on Ozon at all. The list is maintained by hand, so this
// exists to let it be checked against the catalogue rather than drift out of it.
export function ozonListedKeys(): number[] {
  return Object.keys(OZON_LINKS).map(Number);
}

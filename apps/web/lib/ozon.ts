// The second marketplace. Wildberries carries the whole range and its URL is a
// formula over the article number; Ozon carries a handful of pieces shipped from
// our own warehouse (FBS), so the links are an explicit list — a garment gets an
// Ozon button only once its card actually exists there.
//
// Ozon attributes external traffic by `utm_campaign`, and only when the value
// opens with the seller's own prefix (`vendor_org_<id>`, copied from Аналитика →
// Внешний трафик in the seller cabinet). Without the prefix the visitor still
// lands on the card, the sale still happens — it simply never shows up in the
// report, so nobody can tell the site brought it. That makes the prefix
// configuration rather than decoration; it is public (it travels in every link),
// hence NEXT_PUBLIC_.
const VENDOR_PREFIX = (process.env.NEXT_PUBLIC_OZON_VENDOR_PREFIX ?? '').trim();

// Product key (see app/[locale]/products.ts) → the card's address on Ozon.
// Paste the plain link from the seller cabinet; any tagging it arrives with is
// stripped and replaced, so a copy from Ozon's own link builder is safe too.
const OZON_LINKS: Record<number, string> = {
  // 3: Жилет костюмный с баской
  // 18: Жилет с баской и кружевом
  // 5: Юбка-карандаш — off the site until its photography lands
};

function isOzonUrl(url: URL): boolean {
  return url.protocol === 'https:' && (url.hostname === 'ozon.ru' || url.hostname.endsWith('.ozon.ru'));
}

// Prefix first, campaign name after — the shape Ozon's own builder produces.
function campaignValue(name: string): string {
  return VENDOR_PREFIX ? `${VENDOR_PREFIX}_${name}` : name;
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

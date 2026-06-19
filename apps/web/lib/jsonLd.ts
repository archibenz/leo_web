export type BreadcrumbItem = {name: string; url: string};

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export type ProductJsonLdInput = {
  name: string;
  description: string;
  url: string; // absolute product URL
  sku: string;
  price: number;
  inStock: boolean;
  priceValidUntil: string; // YYYY-MM-DD
  images?: readonly (string | null | undefined)[];
  siteUrl: string; // used to absolutise relative image paths
};

function absoluteUrl(url: string, siteUrl: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const base = siteUrl.replace(/\/$/, '');
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
}

// schema.org/Product. Google recommends multiple absolute image URLs, so we
// pass the full gallery (relative paths resolved against siteUrl) rather than a
// single thumbnail. Keep this in sync with the Offer fields Google requires
// for product rich results (price, currency, availability, condition, validity).
export function buildProductJsonLd(input: ProductJsonLdInput) {
  const images = (input.images ?? [])
    .filter((u): u is string => typeof u === 'string' && u.length > 0)
    .map((u) => absoluteUrl(u, input.siteUrl));

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description,
    ...(images.length > 0 && {image: images}),
    url: input.url,
    sku: input.sku,
    brand: {'@type': 'Brand', name: 'REINASLEO'},
    offers: {
      '@type': 'Offer',
      price: input.price,
      priceCurrency: 'RUB',
      availability: input.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      priceValidUntil: input.priceValidUntil,
      url: input.url,
      seller: {'@type': 'Organization', name: 'REINASLEO'},
    },
  };
}

export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(new RegExp(' ', 'g'), '\\u2028')
    .replace(new RegExp(' ', 'g'), '\\u2029');
}

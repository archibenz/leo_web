import type {Metadata} from 'next';
import {headers} from 'next/headers';
import WhiteShopShowcase from './WhiteShopShowcase';
export const revalidate = 600;
import {getStockSnapshot, wbHasStock} from '../../../lib/stock';
import {normalizeWhiteCat, whiteCatLabel, WHITE_PRODUCTS, whiteProductHref} from '../products';
import {brandMeta} from '../../../lib/openGraph';
import {safeJsonLd, buildBreadcrumbJsonLd} from '../../../lib/jsonLd';
import {SITE_URL} from '../../../lib/siteUrl';

// Variant 2 "White" — shop / catalog showcase (pitch preview at
// /<locale>/shop?cat=<category>&q=<query>). noindex. ?cat and ?q are read
// server-side (mirrors the ?p PDP pattern) so filtered / searched views are
// deep-linkable and shareable from the footer / nav.

type Props = {
  params: Promise<{locale: string}>;
  searchParams: Promise<{cat?: string; q?: string; focus?: string; sort?: string}>;
};

// Title reflects the shared view (category or search), mirroring the per-product
// PDP title; title.absolute opts out of the root "REINASLEO · %s" template.
export async function generateMetadata({params, searchParams}: Props): Promise<Metadata> {
  const {locale} = await params;
  const {cat, q} = await searchParams;
  const ru = locale === 'ru';
  const query = typeof q === 'string' ? q.trim() : '';
  const catKey = normalizeWhiteCat(cat);
  const label = query
    ? ru ? `Поиск «${query}»` : `Search “${query}”`
    : catKey === 'all'
      ? ru ? 'Магазин' : 'Shop'
      : whiteCatLabel(catKey, locale);
  const ogTitle = `${label} · REINASLEO`;
  const ogDescription = ru
    ? 'Каталог REINASLEO — платья, верхняя одежда, трикотаж, костюмы и юбки.'
    : 'The REINASLEO catalogue — dresses, outerwear, knitwear, tailoring and skirts.';
  return {
    title: {absolute: ogTitle},
    alternates: {canonical: `/${locale}/shop`},
    description: ru
      ? 'Каталог REINASLEO — платья, верхняя одежда, трикотаж, костюмы и юбки. Реальные цены, доставка по России.'
      : 'The REINASLEO catalogue — dresses, outerwear, knitwear, tailoring and skirts.',
    robots: {index: true, follow: true},
    ...brandMeta({locale, path: '/shop', title: ogTitle, description: ogDescription}),
  };
}

export default async function WhiteShopPage({params, searchParams}: Props) {
  const {locale} = await params;
  const {cat, q, focus, sort} = await searchParams;
  // Sort is shareable/bookmarkable like cat & q; anything unknown falls to 'new'.
  const initialSort = sort === 'asc' || sort === 'desc' ? sort : 'new';
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const ru = locale === 'ru';

  // Tells search this page is the catalogue and names what is in it, so the
  // garments can be understood as a set rather than 18 unrelated links. Listed
  // in catalogue order and never filtered — the markup describes the shop, not
  // whatever ?cat / ?q the visitor happens to be looking at.
  const listJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: ru ? 'Каталог REINASLEO' : 'REINASLEO catalogue',
    numberOfItems: WHITE_PRODUCTS.length,
    itemListElement: WHITE_PRODUCTS.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: ru ? p.ru : p.en,
      url: `${SITE_URL}${whiteProductHref(locale, p)}`,
    })),
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    {name: 'REINASLEO', url: `${SITE_URL}/${locale}`},
    {name: ru ? 'Магазин' : 'Shop', url: `${SITE_URL}/${locale}/shop`},
  ]);

  // Which pieces the marketplaces no longer hold. Computed here, on the server,
  // and handed to the grid so a card can say so without every card asking.
  const snapshot = await getStockSnapshot();
  const soldOutKeys = WHITE_PRODUCTS.filter((p) => !wbHasStock(snapshot, p.nm)).map((p) => p.key);

  return (
    <>
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{__html: safeJsonLd(listJsonLd)}} />
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{__html: safeJsonLd(breadcrumbJsonLd)}} />
      <WhiteShopShowcase
        locale={locale}
        soldOutKeys={soldOutKeys}
        initialCat={normalizeWhiteCat(cat)}
        initialQuery={typeof q === 'string' ? q : ''}
        initialSort={initialSort}
        focusSearch={focus === 'search'}
      />
    </>
  );
}

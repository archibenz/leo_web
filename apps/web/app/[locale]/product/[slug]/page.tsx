import type {Metadata} from 'next';
import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import WhitePdpShowcase from '../WhitePdpShowcase';
import {getStockSnapshot, wbHasStock} from '../../../../lib/stock';
import {WHITE_PRODUCTS, findWhiteProductBySlug, whiteProductHref} from '../../products';
import {safeJsonLd, buildBreadcrumbJsonLd} from '../../../../lib/jsonLd';
import {SITE_URL} from '../../../../lib/siteUrl';
import {buildProductMeta} from '../../../../lib/productMeta';
import {brandCardUrl} from '../../../../lib/openGraph';

// Product page on its own readable address — /<locale>/product/<slug>. The old
// /product?p=<key> form 301s here (see ../page.tsx) so existing links survive.

type Props = {
  params: Promise<{locale: string; slug: string}>;
};

// The catalogue is fully known at build time, so anything outside it is a real
// 404 rather than a page to render on demand. Left at the default, an unknown
// slug rendered notFound() into a cached 200 — a soft 404 that invites crawlers
// to index every mistyped address.
export const dynamicParams = false;

// Stock is read per request from a snapshot on disk, so the page must not be
// frozen at build time. Revalidating every ten minutes keeps it a cached static
// response for almost every visitor while never showing yesterday's shelf.
export const revalidate = 600;

// Every garment is known at build time, so the whole catalogue prerenders as
// static HTML — crawlers get the full markup without running any JS.
export function generateStaticParams() {
  return WHITE_PRODUCTS.flatMap((p) =>
    ['en', 'ru'].map((locale) => ({locale, slug: p.slug})),
  );
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale, slug} = await params;
  const product = findWhiteProductBySlug(slug);
  if (!product) notFound();
  const ru = locale === 'ru';
  const name = ru ? product.ru : product.en;
  const description = ru ? product.descRu : product.descEn;
  const href = whiteProductHref(locale, product);
  const ogImage = product.image ? `${SITE_URL}${product.image}` : brandCardUrl(locale);
  return {
    title: {absolute: `${name} · REINASLEO`},
    alternates: {
      canonical: href,
      // Both locales serve the same slug, so the alternates are a plain swap.
      languages: {
        ru: `/ru/product/${product.slug}`,
        en: `/en/product/${product.slug}`,
      },
    },
    description,
    robots: {index: true, follow: true},
    ...buildProductMeta({
      brandPrefix: '',
      title: name,
      description,
      url: `${SITE_URL}${href}`,
      locale,
      image: ogImage,
    }),
  };
}

export default async function WhiteProductSlugPage({params}: Props) {
  const {locale, slug} = await params;
  const product = findWhiteProductBySlug(slug);
  if (!product) notFound();
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const onWildberries = wbHasStock(await getStockSnapshot(), product.nm);
  const ru = locale === 'ru';
  const url = `${SITE_URL}${whiteProductHref(locale, product)}`;

  // Every frame the page can show, deduped — colour albums included, so image
  // search sees the whole shoot rather than the single opening shot.
  const images = [
    product.image,
    ...(product.gallery ?? []),
    ...product.colors.flatMap((c) => [c.image, ...(c.gallery ?? [])]),
  ].filter((src): src is string => Boolean(src));

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: ru ? product.ru : product.en,
    description: ru ? product.descRu : product.descEn,
    image: [...new Set(images)].map((src) => `${SITE_URL}${src}`),
    sku: String(product.nm),
    mpn: String(product.nm),
    brand: {'@type': 'Brand', name: 'REINASLEO'},
    category: ru ? product.ru : product.en,
    material: ru ? product.compositionRu : product.compositionEn,
    // Colour variants are a real buying signal — spelling them out lets the
    // listing answer "is it in olive?" straight from the search result.
    color: product.colors.map((c) => (ru ? c.ru : c.en)).join(', '),
    // A priceless preorder piece publishes no offer at all: an Offer without a
    // price is invalid for rich results, and inventing one would be worse.
    ...(product.price == null ? {} : {offers: {
      '@type': 'Offer',
      price: product.sale ?? product.price,
      priceCurrency: 'RUB',
      // No `availability` on purpose. Nothing here knows what is actually in
      // stock — the catalogue is a static file and the count lives at
      // Wildberries. Declaring InStock for everything told search all 18
      // garments were on the shelf, and a sold-out piece would keep showing as
      // available until someone noticed. Omitting the field claims nothing;
      // restore it once stock is wired up (Ozon integration is the plan).
      itemCondition: 'https://schema.org/NewCondition',
      url,
      seller: {'@type': 'Organization', name: 'REINASLEO'},
    }}),
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    {name: 'REINASLEO', url: `${SITE_URL}/${locale}`},
    {name: ru ? 'Магазин' : 'Shop', url: `${SITE_URL}/${locale}/shop`},
    {name: ru ? product.ru : product.en, url},
  ]);

  return (
    <>
      <script type="application/ld+json" nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{__html: safeJsonLd(productJsonLd)}} />
      <script type="application/ld+json" nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{__html: safeJsonLd(breadcrumbJsonLd)}} />
      <WhitePdpShowcase locale={locale} product={product} onWildberries={onWildberries} />
    </>
  );
}

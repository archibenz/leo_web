import type {Metadata} from 'next';
import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import WhitePdpShowcase from './WhitePdpShowcase';
import {findWhiteProduct} from '../products';
import {safeJsonLd, buildBreadcrumbJsonLd} from '../../../lib/jsonLd';
import {SITE_URL} from '../../../lib/siteUrl';
import {buildProductMeta} from '../../../lib/productMeta';
import {brandCardUrl} from '../../../lib/openGraph';

// Product page. The ?p key selects the catalogue product, read server-side;
// an unknown key renders the White 404. Indexable — this is the storefront.

type Props = {
  params: Promise<{locale: string}>;
  searchParams: Promise<{p?: string}>;
};

export async function generateMetadata({params, searchParams}: Props): Promise<Metadata> {
  const {locale} = await params;
  const {p} = await searchParams;
  const product = findWhiteProduct(p);
  const ru = locale === 'ru';
  if (!product) notFound();
  const name = ru ? product.ru : product.en;
  const description = ru ? product.descRu : product.descEn;
  // og:image is the product's first photo; the localised brand card stands in if
  // a garment ever ships without one. og:title is the garment name (site_name
  // carries the brand) and the description omits the price by decision.
  const ogImage = product.image ? `${SITE_URL}${product.image}` : brandCardUrl(locale);
  // `absolute` opts out of the root layout's "REINASLEO · %s" template so the
  // brand name isn't doubled in the browser tab.
  return {
    title: {absolute: `${name} · REINASLEO`},
    alternates: {canonical: `/${locale}/product?p=${product.key}`},
    description,
    robots: {index: true, follow: true},
    ...buildProductMeta({
      brandPrefix: '',
      title: name,
      description,
      url: `${SITE_URL}/${locale}/product?p=${product.key}`,
      locale,
      image: ogImage,
    }),
  };
}

export default async function WhiteProductPage({params, searchParams}: Props) {
  const {locale} = await params;
  const {p} = await searchParams;
  const product = findWhiteProduct(p);
  if (!product) notFound();
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const ru = locale === 'ru';
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: ru ? product.ru : product.en,
    description: ru ? product.descRu : product.descEn,
    image: `${SITE_URL}${product.image}`,
    brand: {'@type': 'Brand', name: 'REINASLEO'},
    offers: {
      '@type': 'Offer',
      price: product.sale ?? product.price,
      priceCurrency: 'RUB',
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/${locale}/product?p=${product.key}`,
    },
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    {name: 'REINASLEO', url: `${SITE_URL}/${locale}`},
    {name: ru ? 'Магазин' : 'Shop', url: `${SITE_URL}/${locale}/shop`},
    {name: ru ? product.ru : product.en, url: `${SITE_URL}/${locale}/product?p=${product.key}`},
  ]);
  return (
    <>
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{__html: safeJsonLd(productJsonLd)}} />
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{__html: safeJsonLd(breadcrumbJsonLd)}} />
      <WhitePdpShowcase locale={locale} product={product} />
    </>
  );
}

import type {Metadata} from 'next';
import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import WhitePdpShowcase from './WhitePdpShowcase';
import {findWhiteProduct} from '../products';
import {safeJsonLd} from '../../../../lib/jsonLd';
import {SITE_URL} from '../../../../lib/siteUrl';

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
  // `absolute` opts out of the root layout's "REINASLEO · %s" template so the
  // brand name isn't doubled.
  return {
    title: {absolute: `${name} · REINASLEO`},
    description,
    robots: {index: true, follow: true},
    openGraph: {
      title: `${name} · REINASLEO`,
      description,
      images: [{url: `${SITE_URL}${product.image}`, width: 1050, height: 1400, alt: name}],
    },
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
      url: `${SITE_URL}/${locale}/white/product?p=${product.key}`,
    },
  };
  return (
    <>
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{__html: safeJsonLd(productJsonLd)}} />
      <WhitePdpShowcase locale={locale} product={product} />
    </>
  );
}

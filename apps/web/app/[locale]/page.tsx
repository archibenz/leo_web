import type {Metadata} from 'next';
import {headers} from 'next/headers';
import {safeJsonLd} from '../../lib/jsonLd';
import {SITE_URL} from '../../lib/siteUrl';
import {brandMeta} from '../../lib/openGraph';
import WhiteShowcase from './WhiteShowcase';

// The White storefront home — the site's landing page.

type Props = {params: Promise<{locale: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const ru = locale === 'ru';
  const title = ru ? 'REINASLEO — Премиальная женская одежда' : 'REINASLEO — Premium womenswear';
  // The snippet a search result shows. It has to carry the categories people
  // actually type and then say something a shopper can act on — the old line
  // spent half its length on a mood.
  const description = ru
    ? 'REINASLEO — премиальная женская одежда: платья, пальто, костюмы, жилеты. Натуральные ткани, посадка по фигуре, доставка по России.'
    : 'REINASLEO — premium womenswear: dresses, coats, tailoring, vests. Natural cloth, a fit that follows the body, delivery across Russia.';
  return {
    title: {absolute: title},
    description,
    robots: {index: true, follow: true},
    alternates: {canonical: `/${locale}`},
    ...brandMeta({locale, path: '', title, description}),
  };
}

export default async function WhiteVariantPage({params}: Props) {
  const {locale} = await params;
  const ru = locale === 'ru';
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'REINASLEO',
    description: ru ? 'Премиальная женская одежда' : 'Premium womenswear',
    url: `${SITE_URL}/${locale}`,
    logo: `${SITE_URL}/logos/logo-square.svg`,
  };
  const siteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'REINASLEO',
    url: `${SITE_URL}/${locale}`,
    potentialAction: {
      '@type': 'SearchAction',
      target: {'@type': 'EntryPoint', urlTemplate: `${SITE_URL}/${locale}/shop?q={search_term_string}`},
      'query-input': 'required name=search_term_string',
    },
  };
  return (
    <>
      <script type="application/ld+json" nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{__html: safeJsonLd(orgJsonLd)}} />
      <script type="application/ld+json" nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{__html: safeJsonLd(siteJsonLd)}} />
      <WhiteShowcase locale={locale} />
    </>
  );
}

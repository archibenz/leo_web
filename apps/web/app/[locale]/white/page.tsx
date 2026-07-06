import type {Metadata} from 'next';
import {headers} from 'next/headers';
import {safeJsonLd} from '../../../lib/jsonLd';
import {SITE_URL} from '../../../lib/siteUrl';
import WhiteShowcase from './WhiteShowcase';

// The White storefront home — the site's landing page.

type Props = {params: Promise<{locale: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const ru = locale === 'ru';
  return {
    title: {absolute: ru ? 'REINASLEO — Премиальная женская одежда' : 'REINASLEO — Premium womenswear'},
    description: ru
      ? 'Премиальная женская одежда: платья, пальто, костюмы. Тихая точность кроя — коллекция REINASLEO.'
      : 'Premium womenswear: dresses, coats, tailoring. Quiet precision of cut — the REINASLEO collection.',
    robots: {index: true, follow: true},
    alternates: {canonical: `/${locale}/white`},
    openGraph: {
      type: 'website',
      title: ru ? 'REINASLEO — Премиальная женская одежда' : 'REINASLEO — Premium womenswear',
      description: ru
        ? 'Премиальная женская одежда: платья, пальто, костюмы. Тихая точность кроя — коллекция REINASLEO.'
        : 'Premium womenswear: dresses, coats, tailoring. Quiet precision of cut — the REINASLEO collection.',
      url: `/${locale}/white`,
      images: [{url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: 'REINASLEO'}],
    },
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
    url: `${SITE_URL}/${locale}/white`,
    logo: `${SITE_URL}/logos/logo-square.svg`,
  };
  const siteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'REINASLEO',
    url: `${SITE_URL}/${locale}/white`,
    potentialAction: {
      '@type': 'SearchAction',
      target: {'@type': 'EntryPoint', urlTemplate: `${SITE_URL}/${locale}/white/shop?q={search_term_string}`},
      'query-input': 'required name=search_term_string',
    },
  };
  return (
    <>
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{__html: safeJsonLd(orgJsonLd)}} />
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{__html: safeJsonLd(siteJsonLd)}} />
      <WhiteShowcase locale={locale} />
    </>
  );
}

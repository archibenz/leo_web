import type {Metadata} from 'next';
import {headers} from 'next/headers';
import {safeJsonLd} from '../../lib/jsonLd';
import {SITE_URL} from '../../lib/siteUrl';
import {brandMeta} from '../../lib/openGraph';
import {storefrontForViewer, wantsEditing} from '../../lib/catalogue/viewer';
import {EditorProvider} from '../../components/editor/EditorProvider';
import EditorUnavailable from '../../components/editor/EditorUnavailable';
import WhiteShowcase from './WhiteShowcase';

// The White storefront home — the site's landing page.

// `?edit=1` — режим правки. Параметр делает страницу динамической, что для
// витрины ничего не меняет: она и так рендерится на каждый запрос (layout
// ждёт headers() ради CSP-нонса).
type Props = {params: Promise<{locale: string}>; searchParams: Promise<Record<string, string | string[] | undefined>>};

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

export default async function WhiteVariantPage({params, searchParams}: Props) {
  const {locale} = await params;
  const ru = locale === 'ru';
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  // Публичное чтение идёт через снимок, предпросмотр — никогда: решает одна
  // функция, и обе дороги внутри неё не смешиваются.
  const view = await storefrontForViewer(wantsEditing(await searchParams));
  if (view.storefront === null) return <EditorUnavailable plainHref={`/${locale}`} reason={view.previewError} />;
  const {products, sections} = view.storefront;
  // The edit and the two media blocks are the database's to order now — a piece
  // joins the home page by getting a featuredOrder, not by editing this file.
  const featured = products.filter((p) => p.featuredOrder != null).sort((a, b) => a.featuredOrder! - b.featuredOrder!);
  const hero = sections.find((s) => s.layout === 'hero');
  const setsTeaser = sections.find((s) => s.layout === 'sets-teaser');
  const ticker = sections.find((s) => s.layout === 'ticker');
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
      <EditorProvider editing={view.editing} brokenDrafts={view.storefront.brokenDrafts}>
        <WhiteShowcase locale={locale} featured={featured} hero={hero} setsTeaser={setsTeaser} ticker={ticker} />
      </EditorProvider>
    </>
  );
}

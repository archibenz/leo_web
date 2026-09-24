import type {ReactNode} from 'react';
import {headers} from 'next/headers';
import WhiteChrome from '../WhiteChrome';
import IntentEditNotice from '../../../components/editor/IntentEditNotice';
import {safeJsonLd} from '../../../lib/jsonLd';
import {SITE_URL as siteUrl} from '../../../lib/siteUrl';
import {getSocials} from '../../../lib/site/socials';
import type {Locale} from '../../../i18n';

export default async function ShopLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale: localeParam} = await params;
  const locale = localeParam as Locale;
  // Same per-request CSP nonce the parent layout.tsx reads — fetched again
  // here because this is its own Server Component render.
  const requestHeaders = await headers();
  // Один список соцсетей на подвал и на sameAs ниже — поисковики сверяют пару.
  const socials = await getSocials();
  const nonce = requestHeaders.get('x-nonce') ?? undefined;

  // The storefront is the part of the site search actually sees, so
  // Organization/WebSite JSON-LD lives on this branch only — admin is
  // noindex and renders neither.
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'REINASLEO',
    url: siteUrl,
    logo: `${siteUrl}/logos/logo-white.svg`,
    description:
      locale === 'ru'
        ? 'REINASLEO — премиальная женская одежда: пальто, костюмы, платья, юбки и трикотаж.'
        : 'REINASLEO — premium womenswear: coats, suits, dresses, skirts and knitwear.',
    sameAs: socials.map((s) => s.href),
  };

  // Declares the on-site search so engines can offer it straight in the result
  // and know the query format. Paired with Organization it also anchors the
  // brand name to this domain.
  const siteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'REINASLEO',
    url: `${siteUrl}/${locale}`,
    inLanguage: locale,
    publisher: {'@type': 'Organization', name: 'REINASLEO'},
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/${locale}/shop?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      {/* suppressHydrationWarning is about the nonce, not the JSON. A browser
          blanks the nonce content attribute once the document has loaded (so a
          page cannot read its own nonce back and hand it to an injected
          script), which leaves React comparing nonce="…" from the server with
          nonce="" on the client and calling the tree mismatched — it then
          threw away and re-rendered the whole subtree on /ru/account. The
          attribute is doing its job; only the comparison is wrong. */}
      <script type="application/ld+json" nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{__html: safeJsonLd(orgJsonLd)}} />
      <script type="application/ld+json" nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{__html: safeJsonLd(siteJsonLd)}} />
      {/* Полоса «режим включён, править нечего» — одна на всю витрину. На
          главной и в карточке её гасит правило в globals.css: там страница
          ставит свою, подробную. Держать её здесь, а не в десяти страницах,
          значит не полагаться на то, что следующую страницу не забудут. */}
      <WhiteChrome locale={locale} socials={socials}>
        <IntentEditNotice />
        {children}
      </WhiteChrome>
    </>
  );
}

import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import {headers} from 'next/headers';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import Header from '../../components/Header';
import SmartHeader from '../../components/SmartHeader';
import Footer from '../../components/Footer';
import Providers from '../../components/Providers';
import Metrika from '../../components/Metrika';
import WhiteChrome from './WhiteChrome';
import {safeJsonLd} from '../../lib/jsonLd';
import {SITE_URL as siteUrl} from '../../lib/siteUrl';

import {locales, type Locale} from '../../i18n';

export function generateStaticParams() {
  return locales.map((locale) => ({locale}));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{locale: string}>;
}): Promise<Metadata> {
  const {locale} = await params;
  const isRu = locale === 'ru';
  return {
    title: {
      default: isRu ? 'REINASLEO · Ателье' : 'REINASLEO · Atelier',
      template: 'REINASLEO · %s',
    },
    description: isRu
      ? 'REINASLEO — премиальная женская одежда. Скульптурные силуэты, ручная работа, редакционная подача.'
      : 'REINASLEO — premium womenswear with sculpted silhouettes, precision craftsmanship, and editorial storytelling.',
    // Telegram/X read twitter:card next to the og: tags; without it some
    // clients fall back to a bare-link preview. The preview pages (home, shop,
    // product, info/legal) declare a fuller `twitter` block that replaces this;
    // any route without one inherits this baseline card.
    twitter: {card: 'summary_large_image'},
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale: localeParam} = await params;
  const locale = localeParam as Locale;
  const messages = await getMessages();
  // Per-request CSP nonce, generated in middleware.ts. Falls back to undefined
  // in dev / unit-test contexts where the middleware isn't wired up.
  const requestHeaders = await headers();
  const nonce = requestHeaders.get('x-nonce') ?? undefined;
  // The White storefront lives at the locale root and is the default chrome.
  // Only the infra pages (admin, auth) still use the gradient
  // header/footer/providers; everything else — legal pages included — renders
  // inside WhiteChrome, one header and footer that persist across navigations.
  const pathname = requestHeaders.get('x-pathname') ?? '';
  const isGradientChrome = /^\/(?:[a-z-]+)\/(?:admin|auth)(?:\/|$)/i.test(pathname);

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
    sameAs: ['https://instagram.com/reinasleo', 'https://t.me/reinasleo'],
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

  if (!isGradientChrome) {
    return (
      <NextIntlClientProvider locale={locale} messages={messages}>
        {/* The storefront is the part of the site search actually sees, yet the
            Organization block only ever rendered on the admin/auth branch below
            — every shop page shipped without it.

            suppressHydrationWarning is about the nonce, not the JSON. A browser
            blanks the nonce content attribute once the document has loaded (so a
            page cannot read its own nonce back and hand it to an injected
            script), which leaves React comparing nonce="…" from the server with
            nonce="" on the client and calling the tree mismatched — it then
            threw away and re-rendered the whole subtree on /ru/account. The
            attribute is doing its job; only the comparison is wrong. */}
        <script type="application/ld+json" nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{__html: safeJsonLd(orgJsonLd)}} />
        <script type="application/ld+json" nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{__html: safeJsonLd(siteJsonLd)}} />
        <Metrika nonce={nonce} />
        <WhiteChrome locale={locale}>{children}</WhiteChrome>
      </NextIntlClientProvider>
    );
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Providers>
        <script
          type="application/ld+json"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{__html: safeJsonLd(orgJsonLd)}}
        />
        <Metrika nonce={nonce} />
        <div className="relative flex min-h-screen flex-col">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-paper focus:outline-none"
          >
            {locale === 'ru' ? 'Перейти к содержанию' : 'Skip to main content'}
          </a>
          <SmartHeader>
            <Header locale={locale} />
          </SmartHeader>
          <main id="main-content" className="relative z-40 flex-1">{children}</main>
          <Footer locale={locale} />
        </div>
      </Providers>
    </NextIntlClientProvider>
  );
}

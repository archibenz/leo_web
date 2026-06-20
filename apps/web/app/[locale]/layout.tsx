import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import {headers} from 'next/headers';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import Header from '../../components/Header';
import SmartHeader from '../../components/SmartHeader';
import Footer from '../../components/Footer';
import MobileTabBar from '../../components/MobileTabBar';
import Providers from '../../components/Providers';
import Metrika from '../../components/Metrika';
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
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'REINASLEO',
    url: siteUrl,
    logo: `${siteUrl}/logos/logo-white.svg`,
    sameAs: ['https://instagram.com/reinasleo', 'https://t.me/reinasleo'],
  };

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Providers>
        <script
          type="application/ld+json"
          nonce={nonce}
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
          <MobileTabBar locale={locale} />
        </div>
      </Providers>
    </NextIntlClientProvider>
  );
}

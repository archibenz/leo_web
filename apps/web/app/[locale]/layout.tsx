import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import Header from '../../components/Header';
import SmartHeader from '../../components/SmartHeader';
import Footer from '../../components/Footer';
import Providers from '../../components/Providers';
import {safeJsonLd} from '../../lib/jsonLd';

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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
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
          dangerouslySetInnerHTML={{__html: safeJsonLd(orgJsonLd)}}
        />
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

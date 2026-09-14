import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import {Suspense} from 'react';
import {headers} from 'next/headers';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import Metrika from '../../components/Metrika';
import SiteEventsRouteTracker from '../../components/SiteEventsRouteTracker';

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

  // The White storefront chrome and the admin gradient shell used to be
  // chosen right here, from an `x-pathname` request header set in
  // middleware.ts. That worked for the first full load but not for a
  // client-side transition between the two: this layout is shared by every
  // route under [locale], and the App Router does not remount a shared
  // layout when only its children change, so whichever chrome rendered on
  // the first request stayed mounted for the rest of the session — "Назад на
  // сайт" from admin kept the dark admin shell, and a link the other way
  // kept the White one.
  //
  // (shop)/layout.tsx and (admin)/layout.tsx now own their chrome directly.
  // They are different layout files in different route groups, so the router
  // treats them as different subtrees and actually swaps them on navigation.
  // This layout keeps only what both groups need regardless of which chrome
  // they render in.
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Metrika nonce={nonce} />
      <Suspense fallback={null}>
        <SiteEventsRouteTracker />
      </Suspense>
      {children}
    </NextIntlClientProvider>
  );
}

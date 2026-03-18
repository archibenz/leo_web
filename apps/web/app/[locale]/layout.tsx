import type {ReactNode} from 'react';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import Header from '../../components/Header';
import SmartHeader from '../../components/SmartHeader';
import Footer from '../../components/Footer';
import Providers from '../../components/Providers';

import {locales, type Locale} from '../../i18n';

export function generateStaticParams() {
  return locales.map((locale) => ({locale}));
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

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Providers>
        <div className="relative flex min-h-screen flex-col">
          <SmartHeader>
            <Header locale={locale} />
          </SmartHeader>
          <main className="relative z-10 flex-1">{children}</main>
          <Footer locale={locale} />
        </div>
      </Providers>
    </NextIntlClientProvider>
  );
}

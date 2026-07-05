import type {ReactNode} from 'react';
import WhiteChrome from './WhiteChrome';

// One chrome for every storefront page — the header and footer mount once and
// stay put across client navigations.

export default async function WhiteLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  return <WhiteChrome locale={locale}>{children}</WhiteChrome>;
}

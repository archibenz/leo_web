import type {Metadata} from 'next';
import WhiteShopShowcase from './WhiteShopShowcase';
import {normalizeWhiteCat} from '../products';

// Variant 2 "White" — shop / catalog showcase (pitch preview at
// /<locale>/white/shop?cat=<category>&q=<query>). noindex. ?cat and ?q are read
// server-side (mirrors the ?p PDP pattern) so filtered / searched views are
// deep-linkable and shareable from the footer / nav.

export const metadata: Metadata = {
  title: 'REINASLEO — White · Shop',
  robots: {index: false, follow: false},
};

type Props = {
  params: Promise<{locale: string}>;
  searchParams: Promise<{cat?: string; q?: string; focus?: string}>;
};

export default async function WhiteShopPage({params, searchParams}: Props) {
  const {locale} = await params;
  const {cat, q, focus} = await searchParams;
  return (
    <WhiteShopShowcase
      locale={locale}
      initialCat={normalizeWhiteCat(cat)}
      initialQuery={typeof q === 'string' ? q : ''}
      focusSearch={focus === 'search'}
    />
  );
}

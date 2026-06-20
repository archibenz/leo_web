import type {Metadata} from 'next';
import WhiteShopShowcase from './WhiteShopShowcase';
import {normalizeWhiteCat, whiteCatLabel} from '../products';

// Variant 2 "White" — shop / catalog showcase (pitch preview at
// /<locale>/white/shop?cat=<category>&q=<query>). noindex. ?cat and ?q are read
// server-side (mirrors the ?p PDP pattern) so filtered / searched views are
// deep-linkable and shareable from the footer / nav.

type Props = {
  params: Promise<{locale: string}>;
  searchParams: Promise<{cat?: string; q?: string; focus?: string; sort?: string; colour?: string}>;
};

// Title reflects the shared view (category or search), mirroring the per-product
// PDP title; title.absolute opts out of the root "REINASLEO · %s" template.
export async function generateMetadata({params, searchParams}: Props): Promise<Metadata> {
  const {locale} = await params;
  const {cat, q} = await searchParams;
  const ru = locale === 'ru';
  const query = typeof q === 'string' ? q.trim() : '';
  const catKey = normalizeWhiteCat(cat);
  const label = query
    ? ru ? `Поиск «${query}»` : `Search “${query}”`
    : catKey === 'all'
      ? ru ? 'Магазин' : 'Shop'
      : whiteCatLabel(catKey, locale);
  return {
    title: {absolute: `${label} · REINASLEO — White`},
    robots: {index: false, follow: false},
  };
}

export default async function WhiteShopPage({params, searchParams}: Props) {
  const {locale} = await params;
  const {cat, q, focus, sort, colour} = await searchParams;
  // Sort is shareable/bookmarkable like cat & q; anything unknown falls to 'new'.
  const initialSort = sort === 'asc' || sort === 'desc' ? sort : 'new';
  return (
    <WhiteShopShowcase
      locale={locale}
      initialCat={normalizeWhiteCat(cat)}
      initialQuery={typeof q === 'string' ? q : ''}
      initialSort={initialSort}
      initialColour={typeof colour === 'string' ? colour : 'all'}
      focusSearch={focus === 'search'}
    />
  );
}

import type {Metadata} from 'next';
import WhiteBagShowcase from './WhiteBagShowcase';
import {getStorefront} from '../../../../lib/catalogue/fetch';

// Variant 2 "White" — bag / cart showcase (pitch preview at
// /<locale>/bag). noindex. Honest empty state — no checkout backend.

export const metadata: Metadata = {
  title: 'REINASLEO — White · Bag',
  robots: {index: false, follow: false},
};

type Props = {params: Promise<{locale: string}>};

export default async function WhiteBagPage({params}: Props) {
  const {locale} = await params;
  // The bag lines live in localStorage; the catalogue they are priced and
  // pictured from comes from the API, so the page hands it down.
  const {products} = await getStorefront();
  return <WhiteBagShowcase locale={locale} products={products} />;
}

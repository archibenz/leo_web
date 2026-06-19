import type {Metadata} from 'next';
import WhitePdpShowcase from './WhitePdpShowcase';
import {findWhiteProduct} from '../products';

// Variant 2 "White" — product detail showcase (pitch preview at
// /<locale>/white/product?p=<key>). noindex. The ?p key selects which catalog
// product to show, read server-side (no client useSearchParams needed).

export const metadata: Metadata = {
  title: 'REINASLEO — White · Product',
  robots: {index: false, follow: false},
};

type Props = {
  params: Promise<{locale: string}>;
  searchParams: Promise<{p?: string}>;
};

export default async function WhiteProductPage({params, searchParams}: Props) {
  const {locale} = await params;
  const {p} = await searchParams;
  const product = findWhiteProduct(p) ?? null;
  return <WhitePdpShowcase locale={locale} product={product} />;
}

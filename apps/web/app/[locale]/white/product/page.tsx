import type {Metadata} from 'next';
import WhitePdpShowcase from './WhitePdpShowcase';

// Variant 2 "White" — product detail showcase (pitch preview at
// /<locale>/white/product). noindex.

export const metadata: Metadata = {
  title: 'REINASLEO — White · Product',
  robots: {index: false, follow: false},
};

type Props = {params: Promise<{locale: string}>};

export default async function WhiteProductPage({params}: Props) {
  const {locale} = await params;
  return <WhitePdpShowcase locale={locale} />;
}

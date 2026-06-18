import type {Metadata} from 'next';
import WhiteShopShowcase from './WhiteShopShowcase';

// Variant 2 "White" — shop / catalog showcase (pitch preview at
// /<locale>/white/shop). noindex.

export const metadata: Metadata = {
  title: 'REINASLEO — White · Shop',
  robots: {index: false, follow: false},
};

type Props = {params: Promise<{locale: string}>};

export default async function WhiteShopPage({params}: Props) {
  const {locale} = await params;
  return <WhiteShopShowcase locale={locale} />;
}

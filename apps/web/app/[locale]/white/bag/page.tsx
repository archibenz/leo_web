import type {Metadata} from 'next';
import WhiteBagShowcase from './WhiteBagShowcase';

// Variant 2 "White" — bag / cart showcase (pitch preview at
// /<locale>/white/bag). noindex. Honest empty state — no checkout backend.

export const metadata: Metadata = {
  title: 'REINASLEO — White · Bag',
  robots: {index: false, follow: false},
};

type Props = {params: Promise<{locale: string}>};

export default async function WhiteBagPage({params}: Props) {
  const {locale} = await params;
  return <WhiteBagShowcase locale={locale} />;
}

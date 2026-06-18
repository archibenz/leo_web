import type {Metadata} from 'next';
import WhiteShowcase from './WhiteShowcase';

// Variant 2 "White" — minimalist white-canvas direction (Lichi / Zara / H&M
// reference). Pitch preview at /<locale>/white; the client showcase portals a
// full-bleed white surface over the gradient chrome so leadership can compare
// both directions on one deploy. noindex (preview only).

export const metadata: Metadata = {
  title: 'REINASLEO — White',
  robots: {index: false, follow: false},
};

type Props = {params: Promise<{locale: string}>};

export default async function WhiteVariantPage({params}: Props) {
  const {locale} = await params;
  return <WhiteShowcase locale={locale} />;
}

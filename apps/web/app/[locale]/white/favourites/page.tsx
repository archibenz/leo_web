import type {Metadata} from 'next';
import WhiteFavouritesShowcase from './WhiteFavouritesShowcase';

// Variant 2 "White" — favourites / wishlist showcase (pitch preview at
// /<locale>/white/favourites). noindex. Saved products are held locally
// (useWhiteFavourites / localStorage) — no backend.

export const metadata: Metadata = {
  title: {absolute: 'REINASLEO — White · Saved'},
  robots: {index: false, follow: false},
};

type Props = {params: Promise<{locale: string}>};

export default async function WhiteFavouritesPage({params}: Props) {
  const {locale} = await params;
  return <WhiteFavouritesShowcase locale={locale} />;
}

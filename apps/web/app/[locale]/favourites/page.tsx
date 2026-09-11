import type {Metadata} from 'next';
import WhiteFavouritesShowcase from './WhiteFavouritesShowcase';
import {getStorefront} from '../../../lib/catalogue/fetch';

// Variant 2 "White" — favourites / wishlist showcase (pitch preview at
// /<locale>/favourites). noindex. Saved products are held locally
// (useWhiteFavourites / localStorage) — no backend.

export const metadata: Metadata = {
  title: {absolute: 'REINASLEO — White · Saved'},
  robots: {index: false, follow: false},
};

type Props = {params: Promise<{locale: string}>};

export default async function WhiteFavouritesPage({params}: Props) {
  const {locale} = await params;
  // Favourites are saved keys; the garments behind them come from the API.
  const {products} = await getStorefront();
  return <WhiteFavouritesShowcase locale={locale} products={products} />;
}

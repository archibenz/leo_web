import {notFound} from 'next/navigation';

// Any unmatched /[locale]/white/* path lands here and throws notFound(), which
// renders the nearest boundary — app/[locale]/white/not-found.tsx (the White 404)
// — instead of bubbling up to the dark gradient not-found. The specific White
// routes (shop, product, bag, favourites, atelier, lookbook, contact) take
// priority over this catch-all.
export default function WhiteCatchAllPage() {
  notFound();
}

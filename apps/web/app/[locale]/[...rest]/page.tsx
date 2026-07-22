import {notFound} from 'next/navigation';

// Any unmatched /[locale]/* path lands here and throws notFound(), which
// renders the nearest boundary — app/[locale]/not-found.tsx (the White 404).
// The named routes (shop, product, bag, favourites, sets, lookbook, contact,
// privacy, terms, offer, admin, auth, ...) take priority over this catch-all.
export default function WhiteCatchAllPage() {
  notFound();
}

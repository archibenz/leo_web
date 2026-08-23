import {notFound} from 'next/navigation';

// Any unmatched /[locale]/* path lands here and throws notFound(), which
// renders the nearest boundary — app/[locale]/not-found.tsx (the White 404).
// The named routes (shop, product, bag, favourites, sets, lookbook, contact,
// privacy, terms, offer, admin, auth, ...) take priority over this catch-all.

// The status this route throws does not survive on its own: next-intl v3
// rewrites every page request, and a rewritten response takes its status from
// the rewrite, so this used to answer 200 with the 404 body. The rewrite cannot
// simply be dropped — it is how the [locale] segment resolves, and removing it
// renders empty bodies. middleware.ts puts the 404 on the rewrite itself, for
// addresses it can prove have no page behind them. This route still supplies
// the body.
export default function WhiteCatchAllPage() {
  notFound();
}

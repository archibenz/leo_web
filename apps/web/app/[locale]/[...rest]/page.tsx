import {notFound} from 'next/navigation';

// Any unmatched /[locale]/* path lands here and throws notFound(), which
// renders the nearest boundary — app/[locale]/not-found.tsx (the White 404).
// The named routes (shop, product, bag, favourites, sets, lookbook, contact,
// privacy, terms, offer, admin, auth, ...) take priority over this catch-all.

// KNOWN ISSUE — unknown URLs answer 200 with the 404 body (a soft 404).
// notFound() renders the right page but the status never reaches the client:
// next-intl v3 rewrites every page request, and that rewrite fixes the response
// as 200 before this route renders. Confirmed via `x-middleware-rewrite` on the
// response. Skipping the rewrite for already-localised paths does remove the
// soft 404 — and 404s the entire site with it, since the rewrite is how the
// [locale] segment resolves. Prerendering is not the cause either; the status
// is lost the same way in a production build.
// The fix lives in next-intl v4 (v3.26 here), which is a major upgrade and not
// something to land unattended on a live shop.
export default function WhiteCatchAllPage() {
  notFound();
}

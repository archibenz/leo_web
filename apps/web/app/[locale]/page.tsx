import {redirect} from 'next/navigation';

// The gradient storefront is retired — the site is White-only. Middleware
// already 308-redirects /{locale} → /{locale}/white at the edge; this is the
// belt-and-braces fallback for any request that reaches the page directly.
// The original gradient home lives under gradient-archive/ (kept in the repo,
// excluded from the build).
export default async function LocaleIndex({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  redirect(`/${locale}/white`);
}

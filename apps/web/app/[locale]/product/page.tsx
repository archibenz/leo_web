import {permanentRedirect, notFound} from 'next/navigation';
import {findWhiteProduct, whiteProductHref} from '../products';

// Legacy product address. Garments moved to /<locale>/product/<slug> for search;
// this keeps every old link, bookmark and indexed URL alive with a 301 rather
// than dropping them on a 404. Unknown keys still render the White 404.

// The key lives in the query string, which is absent while prerendering — left
// static, this route resolved every request as "no product" and served the 404.
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{locale: string}>;
  searchParams: Promise<{p?: string}>;
};

export default async function LegacyProductPage({params, searchParams}: Props) {
  const {locale} = await params;
  const {p} = await searchParams;
  const product = findWhiteProduct(p);
  // Middleware already 301s a known key before this renders; reaching here with
  // a product in hand means the edge rule was bypassed, so redirect anyway.
  if (!product) notFound();
  permanentRedirect(whiteProductHref(locale, product));
}

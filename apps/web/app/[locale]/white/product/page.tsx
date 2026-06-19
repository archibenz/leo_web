import type {Metadata} from 'next';
import WhitePdpShowcase from './WhitePdpShowcase';
import {findWhiteProduct} from '../products';

// Variant 2 "White" — product detail showcase (pitch preview at
// /<locale>/white/product?p=<key>). noindex. The ?p key selects which catalog
// product to show, read server-side (no client useSearchParams needed).

type Props = {
  params: Promise<{locale: string}>;
  searchParams: Promise<{p?: string}>;
};

// Per-product title/description from ?p (the key is read server-side anyway).
// Localized en/ru; stays noindex — this is a pitch preview, not a public route.
export async function generateMetadata({params, searchParams}: Props): Promise<Metadata> {
  const {locale} = await params;
  const {p} = await searchParams;
  const product = findWhiteProduct(p);
  const ru = locale === 'ru';
  const robots = {index: false, follow: false} as const;

  // `absolute` opts out of the root layout's "REINASLEO · %s" template so the
  // brand name isn't doubled (e.g. "REINASLEO · … · REINASLEO — White").
  if (!product) {
    return {title: {absolute: ru ? 'Товар · REINASLEO — White' : 'Product · REINASLEO — White'}, robots};
  }
  const name = ru ? product.ru : product.en;
  return {
    title: {absolute: `${name} · REINASLEO — White`},
    description: ru ? product.descRu : product.descEn,
    robots,
  };
}

export default async function WhiteProductPage({params, searchParams}: Props) {
  const {locale} = await params;
  const {p} = await searchParams;
  const product = findWhiteProduct(p) ?? null;
  return <WhitePdpShowcase locale={locale} product={product} />;
}

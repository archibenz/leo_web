import {cache} from 'react';
import type {Metadata} from 'next';
import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import type {Locale} from '../../../../i18n';
import ProductDetailClient from '../../../../components/ProductDetailClient';
import {getTranslations} from 'next-intl/server';
import {safeJsonLd, buildBreadcrumbJsonLd, buildProductJsonLd} from '../../../../lib/jsonLd';
import {buildProductMeta} from '../../../../lib/productMeta';
import {SITE_URL} from '../../../../lib/siteUrl';

import { API_BASE } from '../../../../lib/api';
type Props = {
  params: Promise<{locale: Locale; id: string}>;
};

// Product id format is enforced server-side too; rejecting unsafe values here
// stops crafted ?id=?admin=true style probes from reaching the upstream fetch.
const ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

// Cap inline JSON-LD strings so a misbehaving backend can't blow up the page
// HTML with megabyte-sized fields.
const MAX_JSONLD_LEN = 500;

// The locale layout renders <title> through the template "REINASLEO · %s".
// Keep the rendered title within Google's ~60-char SERP cap by trimming the
// product portion for the brand prefix (the old 160 cap mirrored description
// length and produced ~170-char titles that truncate in search results).
const BRAND_PREFIX = 'REINASLEO · ';
const META_TITLE_MAX = 60;
const PRODUCT_TITLE_MAX = META_TITLE_MAX - BRAND_PREFIX.length;

// React.cache dedupes the fetch within one request: generateMetadata and the
// page function each call fetchProduct once but the network request happens
// only once. revalidate:60 lets the response sit in the Data Cache for a minute
// across requests.
const fetchProduct = cache(async (id: string) => {
  if (!ID_RE.test(id)) return null;
  const res = await fetch(`${API_BASE}/api/catalog/products/${id}`, {next: {revalidate: 60}});
  if (!res.ok) return null;
  return res.json();
});

function cap(s: string | null | undefined, n: number): string {
  if (!s) return '';
  return s.length <= n ? s : s.slice(0, n);
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale, id} = await params;
  const isRu = locale === 'ru';
  const fallbackTitle = isRu ? 'Товар' : 'Product';
  const fallbackDescription = isRu
    ? 'Премиальная женская одежда REINASLEO — скульптурные силуэты и ручная работа.'
    : 'REINASLEO premium womenswear — sculpted silhouettes and precision craftsmanship.';
  const baseAlternates = {
    canonical: `/${locale}/product/${id}`,
    languages: {en: `/en/product/${id}`, ru: `/ru/product/${id}`},
  };

  try {
    const product = await fetchProduct(id);
    if (!product) {
      return {title: fallbackTitle, description: fallbackDescription, alternates: baseAlternates};
    }
    const title = cap(product.title, PRODUCT_TITLE_MAX) || fallbackTitle;
    const description = cap(product.description ?? product.subtitle ?? fallbackDescription, 160);
    const image = product.images?.[0];
    return {
      title,
      description,
      alternates: baseAlternates,
      ...buildProductMeta({
        brandPrefix: BRAND_PREFIX,
        title,
        description,
        url: `${SITE_URL}/${locale}/product/${id}`,
        locale,
        image,
      }),
    };
  } catch {
    return {title: fallbackTitle, description: fallbackDescription, alternates: baseAlternates};
  }
}

export default async function ProductPage({params}: Props) {
  const {locale, id} = await params;
  if (!ID_RE.test(id)) notFound();
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  let productJsonLd = null;
  let breadcrumbJsonLd = null;
  let initialProduct = null;
  try {
    const p = await fetchProduct(id);
    if (p) {
      initialProduct = p;
      const productUrl = `${SITE_URL}/${locale}/product/${id}`;
      const tNav = await getTranslations({locale, namespace: 'nav'});
      breadcrumbJsonLd = buildBreadcrumbJsonLd([
        {name: 'REINASLEO', url: `${SITE_URL}/${locale}`},
        {name: tNav('shop'), url: `${SITE_URL}/${locale}/shop`},
        {name: cap(p.title, MAX_JSONLD_LEN), url: productUrl},
      ]);
      // ~1 year ahead — Google treats a missing priceValidUntil as expiring soon
      const priceValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const imageList = p.images ?? (p.image ? [p.image] : []);
      productJsonLd = buildProductJsonLd({
        name: cap(p.title, MAX_JSONLD_LEN),
        description: cap(p.description ?? p.subtitle ?? '', MAX_JSONLD_LEN),
        url: productUrl,
        sku: p.sku ?? id,
        price: p.price,
        inStock: Boolean(p.inStock),
        priceValidUntil,
        images: imageList,
        siteUrl: SITE_URL,
      });
    }
  } catch { /* API unavailable */ }

  return (
    <>
      {productJsonLd && (
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{__html: safeJsonLd(productJsonLd)}}
        />
      )}
      {breadcrumbJsonLd && (
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{__html: safeJsonLd(breadcrumbJsonLd)}}
        />
      )}
      <ProductDetailClient productId={id} initialProduct={initialProduct} />
    </>
  );
}

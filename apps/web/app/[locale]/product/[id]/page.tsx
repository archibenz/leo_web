import type {Metadata} from 'next';
import type {Locale} from '../../../../i18n';
import ProductDetailClient from '../../../../components/ProductDetailClient';
import {safeJsonLd} from '../../../../lib/jsonLd';

import { API_BASE } from '../../../../lib/api';
type Props = {
  params: Promise<{locale: Locale; id: string}>;
};

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
    const res = await fetch(`${API_BASE}/api/catalog/products/${id}`, {cache: 'no-store'});
    if (!res.ok) {
      return {title: fallbackTitle, description: fallbackDescription, alternates: baseAlternates};
    }
    const product = await res.json();
    const title = product.title ?? fallbackTitle;
    const description = (product.description ?? product.subtitle ?? fallbackDescription).slice(0, 160);
    const image = product.images?.[0];
    return {
      title,
      description,
      alternates: baseAlternates,
      openGraph: {
        title: `REINASLEO · ${title}`,
        description,
        ...(image && {images: [{url: image, alt: title}]}),
      },
    };
  } catch {
    return {title: fallbackTitle, description: fallbackDescription, alternates: baseAlternates};
  }
}

export default async function ProductPage({params}: Props) {
  const {locale, id} = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';

  let productJsonLd = null;
  let initialProduct = null;
  try {
    const res = await fetch(`${API_BASE}/api/catalog/products/${id}`, {cache: 'no-store'});
    if (res.ok) {
      const p = await res.json();
      initialProduct = p;
      productJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.title,
        description: p.description ?? p.subtitle ?? '',
        image: p.images?.[0] ?? p.image,
        url: `${siteUrl}/${locale}/product/${id}`,
        offers: {
          '@type': 'Offer',
          price: p.price,
          priceCurrency: 'RUB',
          availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        },
      };
    }
  } catch { /* API unavailable */ }

  return (
    <>
      {productJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{__html: safeJsonLd(productJsonLd)}}
        />
      )}
      <ProductDetailClient productId={id} initialProduct={initialProduct} />
    </>
  );
}

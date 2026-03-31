import type {Metadata} from 'next';
import type {Locale} from '../../../../i18n';
import ProductDetailClient from '../../../../components/ProductDetailClient';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080';

type Props = {
  params: Promise<{locale: Locale; id: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale, id} = await params;
  try {
    const res = await fetch(`${API_BASE}/api/catalog/products/${id}`, {next: {revalidate: 300}});
    if (!res.ok) return {title: 'Product'};
    const product = await res.json();
    const title = product.title ?? 'Product';
    const description = product.description ?? product.subtitle ?? '';
    const image = product.images?.[0];
    return {
      title,
      description: description.slice(0, 160),
      alternates: {
        canonical: `/${locale}/product/${id}`,
        languages: {en: `/en/product/${id}`, ru: `/ru/product/${id}`},
      },
      openGraph: {
        title: `${title} | REINASLEO`,
        description: description.slice(0, 160),
        ...(image && {images: [{url: image, alt: title}]}),
      },
    };
  } catch {
    return {title: 'Product'};
  }
}

export default async function ProductPage({params}: Props) {
  const {locale, id} = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://82.97.240.123';

  let productJsonLd = null;
  try {
    const res = await fetch(`${API_BASE}/api/catalog/products/${id}`, {next: {revalidate: 300}});
    if (res.ok) {
      const p = await res.json();
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
          dangerouslySetInnerHTML={{__html: JSON.stringify(productJsonLd)}}
        />
      )}
      <ProductDetailClient productId={id} />
    </>
  );
}

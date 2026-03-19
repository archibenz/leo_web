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
  void locale; // used by next-intl via middleware
  return <ProductDetailClient productId={id} />;
}

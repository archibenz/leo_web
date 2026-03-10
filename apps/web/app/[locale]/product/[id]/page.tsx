import type {Locale} from '../../../../i18n';
import ProductDetailClient from '../../../../components/ProductDetailClient';

type Props = {
  params: Promise<{locale: Locale; id: string}>;
};

export default async function ProductPage({params}: Props) {
  const {locale, id} = await params;
  void locale; // used by next-intl via middleware
  return <ProductDetailClient productId={id} />;
}

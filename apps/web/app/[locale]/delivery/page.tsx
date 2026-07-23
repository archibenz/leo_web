import type {Metadata} from 'next';
import WhiteInfoShowcase from '../info/WhiteInfoShowcase';
import {brandMeta} from '../../../lib/openGraph';

// Variant 2 "White" — Delivery & returns page (pitch preview at /<locale>/delivery).
// Indexable — the White variant is the site. title.absolute opts out of the root template.

type Props = {params: Promise<{locale: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const ru = locale === 'ru';
  const title = `${ru ? 'Доставка и возврат' : 'Delivery & returns'} · REINASLEO`;
  const description = ru
    ? 'Доставка и возврат по России — как REINASLEO отправляет заказы и оформляет возврат.'
    : 'Delivery and returns across Russia — how REINASLEO ships orders and handles returns.';
  return {
    title: {absolute: title},
    description,
    robots: {index: true, follow: true},
    alternates: {canonical: `/${locale}/delivery`},
    ...brandMeta({locale, path: '/delivery', title, description}),
  };
}

export default async function WhiteDeliveryPage({params}: Props) {
  const {locale} = await params;
  return <WhiteInfoShowcase locale={locale} ns="delivery" />;
}

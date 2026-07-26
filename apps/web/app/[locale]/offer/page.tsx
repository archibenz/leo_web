import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import type {Locale} from '../../../i18n';
import {brandMeta} from '../../../lib/openGraph';
import WhiteLegalShowcase from '../WhiteLegalShowcase';

type Section = {heading: string; body: string};

export async function generateMetadata({params}: {params: Promise<{locale: Locale}>}): Promise<Metadata> {
  const {locale} = await params;
  const isRu = locale === 'ru';
  const label = isRu ? 'Публичная оферта' : 'Public Offer';
  const description = isRu
    ? 'Публичная оферта REINASLEO: условия дистанционной розничной купли-продажи.'
    : 'REINASLEO public offer: terms of distance retail sale.';
  return {
    title: label,
    description,
    alternates: {
      canonical: `/${locale}/offer`,
      languages: {en: '/en/offer', ru: '/ru/offer'},
    },
    ...brandMeta({locale, path: '/offer', title: `${label} · REINASLEO`, description}),
  };
}

export default async function OfferPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'offer'});
  const sections = t.raw('sections') as Section[];

  return <WhiteLegalShowcase tag={t('tag')} title={t('title')} lastUpdated={t('lastUpdated')} sections={sections} />;
}

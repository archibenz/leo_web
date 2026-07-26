import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import type {Locale} from '../../../i18n';
import {brandMeta} from '../../../lib/openGraph';
import WhiteLegalShowcase from '../WhiteLegalShowcase';

type Section = {heading: string; body: string};

export async function generateMetadata({params}: {params: Promise<{locale: Locale}>}): Promise<Metadata> {
  const {locale} = await params;
  const isRu = locale === 'ru';
  const label = isRu ? 'Условия использования' : 'Terms of Service';
  const description = isRu
    ? 'Условия использования сайта и магазина REINASLEO.'
    : 'The terms that govern use of the REINASLEO website and store.';
  return {
    title: label,
    description,
    alternates: {
      canonical: `/${locale}/terms`,
      languages: {en: '/en/terms', ru: '/ru/terms'},
    },
    ...brandMeta({locale, path: '/terms', title: `${label} · REINASLEO`, description}),
  };
}

export default async function TermsPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'terms'});
  const sections = t.raw('sections') as Section[];

  return <WhiteLegalShowcase tag={t('tag')} title={t('title')} lastUpdated={t('lastUpdated')} sections={sections} />;
}

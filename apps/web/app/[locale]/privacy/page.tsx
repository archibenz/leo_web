import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import type {Locale} from '../../../i18n';
import {brandMeta} from '../../../lib/openGraph';
import WhiteLegalShowcase from '../WhiteLegalShowcase';

type Section = {heading: string; body: string};

export async function generateMetadata({params}: {params: Promise<{locale: Locale}>}): Promise<Metadata> {
  const {locale} = await params;
  const isRu = locale === 'ru';
  const label = isRu ? 'Политика конфиденциальности' : 'Privacy Policy';
  const description = isRu
    ? 'Как REINASLEO собирает, использует и защищает ваши персональные данные.'
    : 'How REINASLEO collects, uses and protects your personal data.';
  return {
    title: label,
    description,
    alternates: {
      canonical: `/${locale}/privacy`,
      languages: {en: '/en/privacy', ru: '/ru/privacy'},
    },
    ...brandMeta({locale, path: '/privacy', title: `${label} · REINASLEO`, description}),
  };
}

export default async function PrivacyPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'privacy'});
  const sections = t.raw('sections') as Section[];

  return <WhiteLegalShowcase tag={t('tag')} title={t('title')} lastUpdated={t('lastUpdated')} sections={sections} />;
}

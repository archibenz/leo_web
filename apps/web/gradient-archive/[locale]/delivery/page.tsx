import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import type {Locale} from '../../../i18n';

type Section = {heading: string; body: string};

export async function generateMetadata({params}: {params: Promise<{locale: Locale}>}): Promise<Metadata> {
  const {locale} = await params;
  const isRu = locale === 'ru';
  return {
    title: isRu ? 'Доставка и возврат' : 'Delivery & Returns',
    description: isRu
      ? 'Условия доставки и возврата REINASLEO: способы, сроки и порядок возврата в течение 14 дней.'
      : 'REINASLEO delivery and return terms: shipping methods, timelines, and the 14-day return policy.',
    alternates: {
      canonical: `/${locale}/delivery`,
      languages: {en: '/en/delivery', ru: '/ru/delivery'},
    },
  };
}

export default async function DeliveryPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'delivery'});
  const sections = t.raw('sections') as Section[];

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-16 lg:px-8">
      <p className="capsule-tag">{t('tag')}</p>
      <h1 className="font-display leading-tight text-ink text-[clamp(1.5rem,4vw,2.5rem)]">{t('title')}</h1>
      <p className="text-sm text-ink-soft">{t('lastUpdated')}</p>
      <div className="space-y-6">
        {sections.map((section, i) => (
          <div key={i} className="paper-card p-6">
            <h2 className="font-display mb-3 text-lg text-ink">{section.heading}</h2>
            <p className="text-sm leading-relaxed text-ink-soft">{section.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

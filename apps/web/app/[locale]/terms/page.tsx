import {getTranslations} from 'next-intl/server';
import type {Locale} from '../../../i18n';

type Section = {heading: string; body: string};

export default async function TermsPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'terms'});
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

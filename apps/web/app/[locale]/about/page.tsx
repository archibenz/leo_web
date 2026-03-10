import {getTranslations} from 'next-intl/server';
import type {Locale} from '../../../i18n';

export default async function AboutPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'about'});

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-16 lg:px-8">
      <p className="capsule-tag">{t('tag')}</p>
      <h1 className="font-display leading-tight text-ink text-[clamp(1.5rem,4vw,2.5rem)]">{t('title')}</h1>
      <p className="text-lg leading-relaxed text-ink-soft">{t('body')}</p>
      <div className="paper-card p-6 text-sm leading-relaxed text-ink-soft">
        {t('note')}
      </div>
    </div>
  );
}

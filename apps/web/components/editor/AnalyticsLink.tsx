'use client';

import {useTranslations} from 'next-intl';
import {ArrowUpRight} from 'lucide-react';
import {useEditorSession} from './useEditorSession';
import {OWNER_LINK, OWNER_LINK_STYLE} from './AdminPanelLink';

// Дашборд аналитики переехал на /analytics того же домена — отдельное
// приложение, которое nginx пускает по той же куке входа, что и сайт. Ссылка
// без локали: своих языков у дашборда нет, а /ru/analytics — это 404 витрины.
// Гейт свой, а не только у OwnerTools: компонент не должен полагаться на то,
// что его всегда кладут внутрь уже закрытого блока.
export default function AnalyticsLink() {
  const {isAdmin} = useEditorSession();
  const t = useTranslations('white.editModeSwitch');

  if (!isAdmin) return null;

  return (
    // eslint-disable-next-line @next/next/no-html-link-for-pages -- Analytics is a separate application served by nginx.
    <a href="/analytics" className={OWNER_LINK} style={OWNER_LINK_STYLE}>
      <span>{t('analyticsLink')}</span>
      <ArrowUpRight className="wv-owner-arrow" size={17} aria-hidden="true" />
    </a>
  );
}

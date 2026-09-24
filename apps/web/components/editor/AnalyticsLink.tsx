'use client';

import {useTranslations} from 'next-intl';
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
    <a href="/analytics" className={OWNER_LINK} style={OWNER_LINK_STYLE}>
      {t('analyticsLink')}
    </a>
  );
}

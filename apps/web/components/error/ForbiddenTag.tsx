'use client';

import {useTranslations} from 'next-intl';
import ErrorTag from './ErrorTag';

interface Props {
  locale: string;
}

export default function ForbiddenTag({locale}: Props) {
  const t = useTranslations('errors.forbidden');

  return (
    <ErrorTag
      variant="private"
      code="403"
      title={t('title')}
      description={t('description')}
      actions={[
        {label: t('actionLogin'), href: `/${locale}/account`, primary: true, icon: 'login'},
        {label: t('actionRequest'), href: `/${locale}/contact`, icon: 'mail'},
      ]}
    />
  );
}

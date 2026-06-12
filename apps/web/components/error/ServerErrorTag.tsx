'use client';

import {useTranslations} from 'next-intl';
import ErrorTag from './ErrorTag';

interface Props {
  locale: string;
  onRetry: () => void;
}

export default function ServerErrorTag({locale, onRetry}: Props) {
  const t = useTranslations('errors.serverError');

  return (
    <ErrorTag
      variant="warn"
      code="500"
      title={t('title')}
      description={t('description')}
      actions={[
        {label: t('actionRetry'), onClick: onRetry, primary: true, icon: 'retry'},
        {label: t('actionHome'), href: `/${locale}`, icon: 'home'},
      ]}
    />
  );
}

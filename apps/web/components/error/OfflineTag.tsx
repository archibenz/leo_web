'use client';

import {useTranslations} from 'next-intl';
import ErrorTag from './ErrorTag';

interface Props {
  locale: string;
  onRetry: () => void;
}

export default function OfflineTag({locale, onRetry}: Props) {
  const t = useTranslations('errors.offline');

  return (
    <ErrorTag
      variant="offline"
      signal
      code="OFF"
      title={t('title')}
      description={t('description')}
      actions={[
        {label: t('actionRetry'), onClick: onRetry, primary: true, icon: 'retry'},
        {label: t('actionHome'), href: `/${locale}`, icon: 'home'},
      ]}
    />
  );
}

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
      tilt="right"
      topLabel={t('topLabel')}
      badge={{label: t('badge'), tone: 'warn'}}
      signal
      code="OFF"
      title={t('title')}
      description={t('description')}
      meta={[
        {label: t('metaWifiLabel'), value: t('metaWifiValue'), italic: true},
        {label: t('metaMobileLabel'), value: t('metaMobileValue')},
        {label: t('metaFlightLabel'), value: t('metaFlightValue'), italic: true},
        {label: t('metaCacheLabel'), value: t('metaCacheValue')},
      ]}
      actions={[
        {label: t('actionRetry'), onClick: onRetry, primary: true},
        {label: t('actionHome'), href: `/${locale}`},
      ]}
    />
  );
}

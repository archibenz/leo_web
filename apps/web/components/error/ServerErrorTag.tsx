'use client';

import {useTranslations} from 'next-intl';
import ErrorTag from './ErrorTag';

interface Props {
  locale: string;
  reference?: string;
  onRetry: () => void;
}

function nowUtcLabel(): string {
  const d = new Date();
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h} : ${m} UTC`;
}

export default function ServerErrorTag({locale, reference, onRetry}: Props) {
  const t = useTranslations('errors.serverError');
  const ref = reference ?? `REI-500-${Math.random().toString(16).slice(2, 6)}`;

  return (
    <ErrorTag
      variant="warn"
      tilt="right"
      topLabel={t('topLabel')}
      badge={{label: t('badge'), tone: 'warn'}}
      code="500"
      title={t('title')}
      description={t('description')}
      meta={[
        {label: t('metaReferenceLabel'), value: ref},
        {label: t('metaTimeLabel'), value: nowUtcLabel()},
        {label: t('metaStatusLabel'), value: t('metaStatusValue'), italic: true},
        {label: t('metaCareLabel'), value: t('metaCareValue')},
      ]}
      actions={[
        {label: t('actionRetry'), onClick: onRetry, primary: true},
        {label: t('actionHome'), href: `/${locale}`},
      ]}
    />
  );
}

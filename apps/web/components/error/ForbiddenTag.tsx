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
      tilt="slight"
      sealed
      topLabel={t('topLabel')}
      code="403"
      title={t('title')}
      description={t('description')}
      meta={[
        {label: t('metaAccessLabel'), value: t('metaAccessValue'), italic: true},
        {label: t('metaMethodLabel'), value: t('metaMethodValue')},
        {label: t('metaContactLabel'), value: t('metaContactValue')},
        {label: t('metaSignedLabel'), value: t('metaSignedValue'), italic: true},
      ]}
      actions={[
        {label: t('actionLogin'), href: `/${locale}/account`, primary: true},
        {label: t('actionRequest'), href: `/${locale}/contact`},
      ]}
    />
  );
}

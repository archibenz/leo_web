'use client';

import {useTranslations} from 'next-intl';
import ErrorTag from './ErrorTag';

interface Props {
  locale: string;
  reference?: string;
}

export default function NotFoundTag({locale, reference = '/page/missing'}: Props) {
  const t = useTranslations('errors.notFound');

  return (
    <ErrorTag
      variant="default"
      tilt="left"
      topLabel={t('topLabel')}
      code="404"
      title={t('title')}
      description={t('description')}
      meta={[
        {label: t('metaReferenceLabel'), value: reference},
        {label: t('metaStatusLabel'), value: t('metaStatusValue'), italic: true},
        {label: t('metaSeasonLabel'), value: t('metaSeasonValue'), italic: true},
        {label: t('metaCareLabel'), value: t('metaCareValue')},
      ]}
      actions={[
        {label: t('actionHome'), href: `/${locale}`, primary: true},
        {label: t('actionShop'), href: `/${locale}/shop`},
      ]}
    />
  );
}

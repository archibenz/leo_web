'use client';

import {useTranslations} from 'next-intl';
import ErrorTag from './ErrorTag';

interface Props {
  locale: string;
}

export default function NotFoundTag({locale}: Props) {
  const t = useTranslations('errors.notFound');

  return (
    <ErrorTag
      variant="default"
      code="404"
      title={t('title')}
      description={t('description')}
      actions={[
        {label: t('actionHome'), href: `/${locale}`, primary: true, icon: 'home'},
        {label: t('actionShop'), href: `/${locale}/shop`, icon: 'shop'},
      ]}
    />
  );
}

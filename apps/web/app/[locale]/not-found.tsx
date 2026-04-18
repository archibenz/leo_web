'use client';

import {useLocale} from 'next-intl';
import NotFoundTag from '../../components/error/NotFoundTag';

export default function LocaleNotFound() {
  const locale = useLocale();
  return <NotFoundTag locale={locale} />;
}

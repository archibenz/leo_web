'use client';

import {useLocale} from 'next-intl';
import ForbiddenTag from '../../../components/error/ForbiddenTag';

export default function ForbiddenPage() {
  const locale = useLocale();
  return <ForbiddenTag locale={locale} />;
}

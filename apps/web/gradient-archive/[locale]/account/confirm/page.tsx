'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useLocale} from 'next-intl';

export default function ConfirmPage() {
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    router.replace(`/${locale}/account`);
  }, [router, locale]);

  return null;
}

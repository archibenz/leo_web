'use client';

import {useLocale} from 'next-intl';
import OfflineTag from '../../../components/error/OfflineTag';

export default function OfflinePage() {
  const locale = useLocale();
  return (
    <OfflineTag
      locale={locale}
      onRetry={() => {
        if (typeof window !== 'undefined') window.location.reload();
      }}
    />
  );
}

'use client';

import {useLocale} from 'next-intl';
import {useEffect} from 'react';
import ServerErrorTag from '../../components/error/ServerErrorTag';

interface ErrorProps {
  error: Error & {digest?: string};
  reset: () => void;
}

export default function LocaleError({error, reset}: ErrorProps) {
  const locale = useLocale();

  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.error('[LocaleError]', error);
    }
  }, [error]);

  return <ServerErrorTag locale={locale} reference={error.digest} onRetry={reset} />;
}

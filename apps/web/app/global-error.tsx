'use client';

import {NextIntlClientProvider, type AbstractIntlMessages} from 'next-intl';
import {useEffect, useState} from 'react';
import ServerErrorTag from '../components/error/ServerErrorTag';
import {defaultLocale} from '../i18n-routing';

interface GlobalErrorProps {
  error: Error & {digest?: string};
  reset: () => void;
}

export default function GlobalError({error, reset}: GlobalErrorProps) {
  const [messages, setMessages] = useState<AbstractIntlMessages | null>(null);

  useEffect(() => {
    import(`../messages/${defaultLocale}.json`)
      .then((m) => setMessages(m.default))
      .catch(() => setMessages({}));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.error('[GlobalError]', error);
    }
  }, [error]);

  if (!messages) {
    return (
      <html lang={defaultLocale}>
        <body />
      </html>
    );
  }

  return (
    <html lang={defaultLocale}>
      <body>
        <NextIntlClientProvider locale={defaultLocale} messages={messages}>
          <ServerErrorTag locale={defaultLocale} reference={error.digest} onRetry={reset} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

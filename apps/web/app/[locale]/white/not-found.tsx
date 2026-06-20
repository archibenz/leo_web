'use client';

import {useLocale} from 'next-intl';
import WhiteNotFoundShowcase from './WhiteNotFoundShowcase';

// Segment-level not-found for /[locale]/white/* — unmatched White URLs render the
// White 404 instead of bubbling up to the dark gradient not-found.
export default function WhiteNotFound() {
  const locale = useLocale();
  return <WhiteNotFoundShowcase locale={locale} />;
}

'use client';

import {usePathname, useSearchParams} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {INK, MUTED} from './wv-palette';

// EN/RU switch for the White preview. Both locales render the full showcase
// (/[locale]/white/...), but there was no UI to move between them. Raw <a> — no
// JS needed to navigate; the active locale is marked (aria-current), not a link.
// Swaps the locale segment of the current path, keeps the query string (the
// PDP lives at ?p=<key>) and is resilient to a locale-stripped pathname.

const LOCALES = [
  {code: 'en', label: 'EN'},
  {code: 'ru', label: 'RU'},
] as const;

export default function WhiteLocaleSwitch({locale}: {locale: string}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('white.localeSwitch');
  // Keep the query — dropping it turned the PDP's ?p into a 404 on switch.
  const query = searchParams.toString();
  const suffix = query ? `?${query}` : '';

  const hrefFor = (code: string) => {
    const path = pathname || `/${locale}/white`;
    const segs = path.split('/');
    if (segs[1] === 'en' || segs[1] === 'ru') {
      segs[1] = code;
      return segs.join('/') + suffix;
    }
    // next-intl stripped the locale prefix → re-add it.
    return `/${code}${path}${suffix}`;
  };

  return (
    <nav
      aria-label={t('label')}
      className="flex items-center gap-2"
    >
      {LOCALES.map((l, i) => (
        <span key={l.code} className="flex items-center gap-2">
          {l.code === locale ? (
            <span aria-current="true" style={{color: INK}}>
              {l.label}
            </span>
          ) : (
            <a
              href={hrefFor(l.code)}
              hrefLang={l.code}
              className="-my-2 inline-flex h-11 min-w-11 items-center justify-center px-2 transition-opacity hover:opacity-60"
              style={{color: MUTED}}
            >
              {l.label}
            </a>
          )}
          {i === 0 && (
            <span aria-hidden="true" style={{color: MUTED}}>
              /
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

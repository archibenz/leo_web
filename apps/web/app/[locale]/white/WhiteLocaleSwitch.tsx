'use client';

import {usePathname} from 'next/navigation';
import {INK, MUTED} from './wv-palette';

// EN/RU switch for the White preview. Both locales render the full showcase
// (/[locale]/white/...), but there was no UI to move between them. Raw <a> — no
// JS needed to navigate; the active locale is marked (aria-current), not a link.
// Swaps the locale segment of the current path (drops query, like the gradient
// FooterLanguageSelect) and is resilient to a locale-stripped pathname.

const LOCALES = [
  {code: 'en', label: 'EN'},
  {code: 'ru', label: 'RU'},
] as const;

export default function WhiteLocaleSwitch({locale}: {locale: string}) {
  const pathname = usePathname();

  const hrefFor = (code: string) => {
    const path = pathname || `/${locale}/white`;
    const segs = path.split('/');
    if (segs[1] === 'en' || segs[1] === 'ru') {
      segs[1] = code;
      return segs.join('/');
    }
    // next-intl stripped the locale prefix → re-add it.
    return `/${code}${path}`;
  };

  return (
    <nav
      aria-label={locale === 'ru' ? 'Выбор языка' : 'Language'}
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

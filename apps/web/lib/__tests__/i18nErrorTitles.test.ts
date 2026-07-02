import {describe, it, expect} from 'vitest';
import en from '../../messages/en.json';
import ru from '../../messages/ru.json';

// Regression guard for lw-gsfj: errors.forbidden.title and errors.offline.title
// in ru.json were byte-identical copies of the en.json copy (English/French
// left untranslated). ErrorTag.tsx renders this string as the page's only
// <h1> (sr-only) — the accessible name of the whole error page — so a stale
// locale value here is a screen-reader-facing a11y bug, not just cosmetic.
describe('i18n error titles are translated per locale', () => {
  const errorKeys = Object.keys(en.errors) as Array<keyof typeof en.errors>;

  it('ru.json defines the same error keys as en.json', () => {
    expect(Object.keys(ru.errors).sort()).toEqual(errorKeys.slice().sort());
  });

  it.each(errorKeys)('errors.%s.title differs between en and ru', (key) => {
    const enTitle = en.errors[key].title;
    const ruTitle = ru.errors[key].title;

    expect(ruTitle).toBeTruthy();
    expect(ruTitle).not.toBe(enTitle);
  });
});

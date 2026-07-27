import {readFileSync} from 'node:fs';

// User-visible copy is edited weekly. Every spec reads its strings from the same
// catalogue the app renders from, so a reworded label stays a copy change
// instead of a broken test — pinned Russian strings are what rotted the specs
// these replace. Read from disk rather than imported: this package is ESM
// ("type": "module"), where a JSON import needs an import attribute.

type Catalogue = {white: Record<string, Record<string, string> | undefined>};

export const ru = JSON.parse(
  readFileSync(new URL('../../messages/ru.json', import.meta.url), 'utf8'),
) as Catalogue;

// A key that moves must fail as "the catalogue moved". Without this a rename
// leaves `undefined` inside a locator, and getByRole(..., {name: undefined})
// quietly matches every element of that role on the page.
export function copy(group: string, key: string): string {
  const value = ru.white[group]?.[key];
  if (!value) throw new Error(`messages/ru.json has no white.${group}.${key}`);
  return value;
}

// Mirrors a component's own useTranslations('white.<group>') call site.
export const messages = (group: string) => (key: string) => copy(group, key);

import {describe, it, expect} from 'vitest';
import {STOREFRONT_FIXTURE as SF} from './fixture';
import type {TickerItem} from './types';
import {
  findProductByKey,
  findProductBySlug,
  findSet,
  setColour,
  whitePriceRange,
  whiteAvailability,
  whiteInStock,
  whiteProductHref,
  normalizeWhiteCat,
  moscowDateString,
  selectTickerItems,
} from './select';

describe('lookups', () => {
  it('finds by key whether the key arrives as number or string', () => {
    expect(findProductByKey(SF.products, 8)?.slug).toBe('yubka-ballon-atlasnaya');
    expect(findProductByKey(SF.products, '8')?.slug).toBe('yubka-ballon-atlasnaya');
    expect(findProductByKey(SF.products, undefined)).toBeUndefined();
  });
  it('finds by slug', () => expect(findProductBySlug(SF.products, 'palto-pidzhak-pritalennoe')?.key).toBe(2));
  it('resolves the colour worn in a set, falling back to the first colour', () => {
    const set = findSet(SF.sets, 'everyday')!;
    const skirt = findProductByKey(SF.products, 8)!;
    // The look wears ivory, which is deliberately not the skirt's first colour:
    // a setColour that always returned colors[0] would sell the red one.
    expect(setColour(set, skirt).key).toBe('ivory');
    expect(setColour(set, skirt)).not.toBe(skirt.colors[0]);
    expect(setColour(set, findProductByKey(SF.products, 21)!).key).toBe(SF.products[2]!.colors[0]!.key);
  });
});

describe('price range', () => {
  it('reports «from» when colourways differ', () => expect(whitePriceRange(findProductByKey(SF.products, 8)!)).toEqual({min: 2250, max: 5000, varies: true}));
});

describe('availability', () => {
  it('a priceless piece is never available', () => expect(whiteAvailability(findProductByKey(SF.products, 21)!, {onWb: true})).toBe('none'));
  it('site sales stay switched off in this stage', () => expect(whiteInStock(SF.products[0]!)).toBe(false));
});

describe('links and filters', () => {
  it('builds the canonical product path', () => expect(whiteProductHref('ru', SF.products[0]!)).toBe('/ru/product/palto-pidzhak-pritalennoe'));
  it('collapses an unrecognised category to all', () => {
    expect(normalizeWhiteCat('skirts')).toBe('skirts');
    expect(normalizeWhiteCat('handbags')).toBe('all');
    expect(normalizeWhiteCat(null)).toBe('all');
  });
});

describe('moscowDateString', () => {
  // Europe/Moscow has been a fixed UTC+3 with no DST since 2014 — the function
  // under test relies on exactly that fixed offset (see lib/catalogue/select.ts).
  it('is three hours ahead of UTC — the calendar date rolls over before UTC midnight', () => {
    expect(moscowDateString(new Date('2026-01-01T20:30:00Z'))).toBe('2026-01-01');
    expect(moscowDateString(new Date('2026-01-01T21:30:00Z'))).toBe('2026-01-02');
  });
});

describe('home ticker selection', () => {
  const item = (overrides: Partial<TickerItem> = {}): TickerItem => ({
    ru: 'Скидка 20% до воскресенья',
    en: '20% off until Sunday',
    ...overrides,
  });

  it('an empty list means the ticker is not shown at all', () => {
    expect(selectTickerItems([], 'ru', new Date('2026-09-12T12:00:00Z'))).toEqual([]);
  });

  it('a line with no `until` always shows, whatever the date', () => {
    const line = item({until: undefined});
    expect(selectTickerItems([line], 'ru', new Date('2099-01-01T00:00:00Z'))).toEqual([line]);
  });

  it('an expired line does not show', () => {
    const line = item({until: '2026-09-10'});
    expect(selectTickerItems([line], 'ru', new Date('2026-09-11T09:00:00Z'))).toEqual([]);
  });

  // Требование владельца: граница проверяется по МСК, а не по UTC, и ровно в
  // день until строка ещё видна — до последней минуты этого дня по Москве.
  it('shows on the `until` day itself, up to 23:59 Moscow time', () => {
    const line = item({until: '2026-09-14'});
    // 23:59 МСК 14 сентября = 20:59 UTC того же дня.
    expect(selectTickerItems([line], 'ru', new Date('2026-09-14T20:59:00Z'))).toEqual([line]);
  });

  it('is gone by 00:01 Moscow time on the day after `until`', () => {
    const line = item({until: '2026-09-14'});
    // 00:01 МСК 15 сентября = 21:01 UTC 14 сентября.
    expect(selectTickerItems([line], 'ru', new Date('2026-09-14T21:01:00Z'))).toEqual([]);
  });

  it('a line with no `en` shows on the Russian page but not the English one — ru is never substituted', () => {
    const line = item({en: undefined});
    const now = new Date('2026-09-12T12:00:00Z');
    expect(selectTickerItems([line], 'ru', now)).toEqual([line]);
    expect(selectTickerItems([line], 'en', now)).toEqual([]);
  });

  it('whitespace-only text counts as absent, not as a line to show', () => {
    const line = item({en: '   '});
    expect(selectTickerItems([line], 'en', new Date('2026-09-12T12:00:00Z'))).toEqual([]);
  });

  it('keeps the surviving order and drops only the lines that fail a rule', () => {
    const keep = item({ru: 'Открытие шоурума'});
    const expired = item({ru: 'Просрочено', until: '2020-01-01'});
    const now = new Date('2026-09-12T12:00:00Z');
    expect(selectTickerItems([keep, expired], 'ru', now)).toEqual([keep]);
  });
});

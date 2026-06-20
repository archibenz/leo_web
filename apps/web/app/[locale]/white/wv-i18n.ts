// Variant 2 "White" — shared count/plural helpers. The inline t(en,ru) pattern
// can't express ICU plurals, so the item-count noun lives here: English
// item/items + the Russian 3-form (one / few / many). Single source so the
// header aria-labels, shop count and favourites count never drift.

export function whiteItemNoun(n: number, locale: string): string {
  if (locale !== 'ru') return n === 1 ? 'item' : 'items';
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'товар';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'товара';
  return 'товаров';
}

import {describe, expect, it} from 'vitest';
import {whiteItemNoun} from './wv-i18n';

describe('whiteItemNoun', () => {
  it('English: singular for 1, plural otherwise', () => {
    expect(whiteItemNoun(0, 'en')).toBe('items');
    expect(whiteItemNoun(1, 'en')).toBe('item');
    expect(whiteItemNoun(2, 'en')).toBe('items');
    expect(whiteItemNoun(5, 'en')).toBe('items');
  });

  it('Russian 3-form: one / few / many', () => {
    // one (товар): ...1 except 11
    expect(whiteItemNoun(1, 'ru')).toBe('товар');
    expect(whiteItemNoun(21, 'ru')).toBe('товар');
    expect(whiteItemNoun(101, 'ru')).toBe('товар');
    // few (товара): ...2-4 except 12-14
    expect(whiteItemNoun(2, 'ru')).toBe('товара');
    expect(whiteItemNoun(3, 'ru')).toBe('товара');
    expect(whiteItemNoun(24, 'ru')).toBe('товара');
    // many (товаров): 0, 5-20, ...
    expect(whiteItemNoun(0, 'ru')).toBe('товаров');
    expect(whiteItemNoun(5, 'ru')).toBe('товаров');
    expect(whiteItemNoun(11, 'ru')).toBe('товаров');
    expect(whiteItemNoun(12, 'ru')).toBe('товаров');
    expect(whiteItemNoun(14, 'ru')).toBe('товаров');
    expect(whiteItemNoun(25, 'ru')).toBe('товаров');
  });
});

import {describe, it, expect} from 'vitest';
import {destinationFromHref, hrefForDestination, isLocalHref} from '../tickerDestination';

// Логика «Куда ведёт» отдельно от формы: собрать href из выбора владельца и
// разобрать существующий href обратно в выбор при открытии панели. Чистые
// функции — без React, без DOM, без сети.

describe('hrefForDestination — сборка адреса из выбора', () => {
  it('«Без ссылки» — null, а не пустая строка', () => {
    expect(hrefForDestination({kind: 'none', locale: 'ru', productSlug: '', customHref: ''})).toBeNull();
  });

  it('«Магазин» — /<locale>/shop', () => {
    expect(hrefForDestination({kind: 'shop', locale: 'ru', productSlug: '', customHref: ''})).toBe('/ru/shop');
  });

  it('«Сеты» — /<locale>/sets', () => {
    expect(hrefForDestination({kind: 'sets', locale: 'ru', productSlug: '', customHref: ''})).toBe('/ru/sets');
  });

  it('«Лукбук» — /<locale>/lookbook', () => {
    expect(hrefForDestination({kind: 'lookbook', locale: 'ru', productSlug: '', customHref: ''})).toBe('/ru/lookbook');
  });

  it('локаль берётся та, что передана — не захардкожена в ru', () => {
    expect(hrefForDestination({kind: 'shop', locale: 'en', productSlug: '', customHref: ''})).toBe('/en/shop');
  });

  it('«Конкретный товар» — /<locale>/product/<slug>', () => {
    expect(hrefForDestination({kind: 'product', locale: 'ru', productSlug: 'yubka-ballon-atlasnaya', customHref: ''})).toBe(
      '/ru/product/yubka-ballon-atlasnaya',
    );
  });

  it('«Конкретный товар» без выбранного слага — null, а не битый адрес /ru/product/', () => {
    expect(hrefForDestination({kind: 'product', locale: 'ru', productSlug: '', customHref: ''})).toBeNull();
  });

  it('«Своя ссылка» — то, что вписано, обрезанное по краям', () => {
    expect(hrefForDestination({kind: 'custom', locale: 'ru', productSlug: '', customHref: '  /ru/contact  '})).toBe('/ru/contact');
  });

  it('«Своя ссылка» пустая — null, как «Без ссылки»', () => {
    expect(hrefForDestination({kind: 'custom', locale: 'ru', productSlug: '', customHref: '   '})).toBeNull();
  });
});

describe('destinationFromHref — разбор существующего href при открытии панели', () => {
  it('пусто/undefined — «Без ссылки»', () => {
    expect(destinationFromHref(undefined, 'ru', [])).toEqual({kind: 'none', productSlug: '', customHref: ''});
    expect(destinationFromHref(null, 'ru', [])).toEqual({kind: 'none', productSlug: '', customHref: ''});
  });

  it('/ru/shop — «Магазин»', () => {
    expect(destinationFromHref('/ru/shop', 'ru', [])).toEqual({kind: 'shop', productSlug: '', customHref: ''});
  });

  it('/ru/lookbook — «Лукбук» (реальная строка из STOREFRONT_DRAFT_FIXTURE)', () => {
    expect(destinationFromHref('/ru/lookbook', 'ru', [])).toEqual({kind: 'lookbook', productSlug: '', customHref: ''});
  });

  it('/ru/product/<known-slug> — «Конкретный товар» с этим слагом', () => {
    expect(destinationFromHref('/ru/product/yubka-ballon-atlasnaya', 'ru', ['yubka-ballon-atlasnaya'])).toEqual({
      kind: 'product',
      productSlug: 'yubka-ballon-atlasnaya',
      customHref: '',
    });
  });

  it('/ru/product/<неизвестный-слаг> — «Своя ссылка», а не молчаливая потеря значения', () => {
    expect(destinationFromHref('/ru/product/discontinued-piece', 'ru', ['yubka-ballon-atlasnaya'])).toEqual({
      kind: 'custom',
      productSlug: '',
      customHref: '/ru/product/discontinued-piece',
    });
  });

  it('href под другой локалью — «Своя ссылка», не путается с текущей', () => {
    expect(destinationFromHref('/en/shop', 'ru', [])).toEqual({kind: 'custom', productSlug: '', customHref: '/en/shop'});
  });

  it('что угодно нераспознанное — «Своя ссылка» с исходным значением как есть', () => {
    expect(destinationFromHref('/ru/contact', 'ru', [])).toEqual({kind: 'custom', productSlug: '', customHref: '/ru/contact'});
  });
});

describe('isLocalHref — то же правило, что и на сервере (TickerItemRequest.href)', () => {
  it.each(['/ru/shop', '/ru/sets', '/', '/a', '/ru/product/foo-bar'])('принимает свой путь: %s', (value) => {
    expect(isLocalHref(value)).toBe(true);
  });

  it.each([
    'https://evil.example/phish',
    '//evil.example/phish',
    'shop',
    '/ru/../secret',
    '/ru/sets/../../../etc/passwd',
    '/ru/has space',
    '',
  ])('отклоняет: %s', (value) => {
    expect(isLocalHref(value)).toBe(false);
  });
});

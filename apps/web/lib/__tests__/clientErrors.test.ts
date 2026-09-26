import {describe, it, expect} from 'vitest';
import {ClientErrorBuffer, browserFamily, isNoise, ourFrames, toEvent, type ClientErrorEvent} from '../clientErrors';

// Ошибки браузера → аналитика (lib/clientErrors.ts). Сторожит то, что
// испортило бы тревоги владельцу: шум чужих скриптов и расширений в них,
// полный User-Agent и query в адресе, сто строк вместо одной со счётчиком.

const ORIGIN = 'https://reinasleo.com';
const LOC = {origin: ORIGIN, pathname: '/ru/product/palto'};
const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const OUR_STACK = `TypeError: x is undefined
    at addToBag (https://reinasleo.com/_next/static/chunks/app/page-abc.js?v=1:1:2034)
    at onClick (https://reinasleo.com/_next/static/chunks/main.js:2:88)`;
const EXTENSION_STACK = `TypeError: boom
    at inject (chrome-extension://abcdefgh/content.js:10:5)`;
const METRIKA_STACK = `Error: m
    at t (https://mc.yandex.ru/metrika/tag.js:1:100)`;

describe('шум не поднимает тревогу', () => {
  it('«Script error.» и ResizeObserver — шум', () => {
    expect(isNoise('Script error.', undefined, ORIGIN)).toBe(true);
    expect(isNoise('ResizeObserver loop completed with undelivered notifications.', undefined, ORIGIN)).toBe(true);
  });

  it('стек без единого нашего кадра — расширение или Метрика, шум', () => {
    expect(isNoise('boom', EXTENSION_STACK, ORIGIN)).toBe(true);
    expect(isNoise('m', METRIKA_STACK, ORIGIN)).toBe(true);
  });

  it('наша ошибка и отклонённый промис без стека — не шум', () => {
    expect(isNoise('x is undefined', OUR_STACK, ORIGIN)).toBe(false);
    expect(isNoise('fetch failed', undefined, ORIGIN)).toBe(false);
  });
});

describe('кадры стека', () => {
  it('Chrome: только наши, путь без домена и query, позиция и имя функции — одинаково с query и без', () => {
    expect(ourFrames(OUR_STACK, ORIGIN)).toEqual([
      '/_next/static/chunks/app/page-abc.js:1:2034 addToBag',
      '/_next/static/chunks/main.js:2:88 onClick',
    ]);
  });

  it('Safari: fn@url', () => {
    expect(ourFrames('addToBag@https://reinasleo.com/_next/static/chunks/a.js:1:20', ORIGIN)).toEqual([
      '/_next/static/chunks/a.js:1:20 addToBag',
    ]);
  });

  it('чужие кадры отброшены', () => {
    expect(ourFrames(METRIKA_STACK, ORIGIN)).toEqual([]);
  });
});

describe('браузер — семейство и мажорная версия, не полный UA', () => {
  it.each([
    [CHROME, 'Chrome 128'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', 'Safari 18'],
    ['Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 YaBrowser/24.4.0.0 Safari/537.36', 'Yandex 24'],
    ['Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 Edg/128.0', 'Edge 128'],
    ['Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0', 'Firefox 130'],
  ])('%s → %s', (ua, expected) => {
    expect(browserFamily(ua)).toBe(expected);
  });
});

describe('событие', () => {
  it('несёт путь без query, класс, наши кадры и семейство браузера', () => {
    const err = new TypeError('x is undefined');
    err.stack = OUR_STACK;
    expect(toEvent('window_error', err, LOC, CHROME)).toMatchObject({
      kind: 'window_error',
      errorClass: 'TypeError',
      message: 'x is undefined',
      route: '/ru/product/palto',
      browser: 'Chrome 128',
      count: 1,
    });
  });

  it('шум не становится событием', () => {
    const err = new Error('boom');
    err.stack = EXTENSION_STACK;
    expect(toEvent('window_error', err, LOC, CHROME)).toBeNull();
  });

  it('отклонённый промис со строкой — событие без кадров', () => {
    expect(toEvent('unhandled_rejection', 'fetch failed', LOC, CHROME)).toMatchObject({message: 'fetch failed', frames: []});
  });
});

describe('склейка во вкладке', () => {
  const e = (message: string): ClientErrorEvent => ({
    kind: 'window_error', errorClass: 'E', message, frames: ['/a.js f'], route: '/ru', browser: null, count: 1,
  });

  it('ошибка в цикле — одна строка со счётчиком', () => {
    const b = new ClientErrorBuffer();
    for (let i = 0; i < 5; i++) b.add(e('same'));
    expect(b.take()).toEqual([expect.objectContaining({message: 'same', count: 5})]);
  });

  it('пачка не больше 20, остальное — в следующую', () => {
    const b = new ClientErrorBuffer();
    for (let i = 0; i < 25; i++) b.add(e(`m${i}`));
    expect(b.take()).toHaveLength(20);
    expect(b.size).toBe(5);
  });
});

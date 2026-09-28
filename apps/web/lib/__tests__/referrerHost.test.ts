import {describe, it, expect, vi, afterEach} from 'vitest';
import {referrerHostOf} from '../referrerHost';

// Хост реферера (28.09): только хост, свой домен и пусто — direct, «www.»
// срезается с обеих сторон, чтобы www.reinasleo.com не стал «чужим».

describe('хост реферера', () => {
  it('чужая страница — только её хост, без пути и строки запроса', () => {
    expect(referrerHostOf('https://t.me/reinasleo/15?single', 'reinasleo.com')).toBe('t.me');
    expect(referrerHostOf('https://WWW.Yandex.RU/search/?text=платье', 'reinasleo.com')).toBe('yandex.ru');
  });

  it('свой домен (и с www) и пустой реферер — direct', () => {
    expect(referrerHostOf('https://reinasleo.com/ru/shop', 'reinasleo.com')).toBe('direct');
    expect(referrerHostOf('https://www.reinasleo.com/ru', 'reinasleo.com')).toBe('direct');
    expect(referrerHostOf('', 'reinasleo.com')).toBe('direct');
    expect(referrerHostOf('не адрес', 'reinasleo.com')).toBe('direct');
  });
});

describe('один раз на загрузку', () => {
  afterEach(() => vi.resetModules());

  it('первый вызов отдаёт хост, следующие — ничего', async () => {
    Object.defineProperty(document, 'referrer', {value: 'https://t.me/x', configurable: true});
    const {takeReferrerHost} = await import('../referrerHost');
    expect(takeReferrerHost()).toBe('t.me');
    expect(takeReferrerHost()).toBeUndefined();
  });
});

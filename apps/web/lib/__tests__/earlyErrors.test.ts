import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {earlyErrorsScript, takeEarlyErrors} from '../earlyErrors';

// Инлайн из <head> (lib/earlyErrors.ts) исполняется здесь той же строкой,
// что уходит в страницу, — не пересказом. Сторожит три обещания: ошибка до
// гидрации не теряется; упавший чанк, после которого гидрации нет, всё равно
// уходит на скрытии вкладки; после того как буфер забрал сборщик, инлайн
// молчит — иначе дубль.

type Beacon = {url: string; body: {events: Array<Record<string, unknown>>}};
let beacons: Promise<Beacon>[];

function boot(release?: string): void {
  new Function(earlyErrorsScript(release))();
}

function throwOnWindow(error: unknown): void {
  window.dispatchEvent(new ErrorEvent('error', {error, message: error instanceof Error ? error.message : String(error)}));
}

function reject(reason: unknown): void {
  const e = new Event('unhandledrejection') as Event & {reason: unknown};
  e.reason = reason;
  window.dispatchEvent(e);
}

function failScript(src: string, tag = 'script'): void {
  const el = document.createElement(tag);
  el.setAttribute('src', src);
  document.head.appendChild(el);
  el.dispatchEvent(new Event('error'));
  el.remove();
}

function hideTab(): void {
  Object.defineProperty(document, 'visibilityState', {configurable: true, get: () => 'hidden'});
  document.dispatchEvent(new Event('visibilitychange'));
}

async function sent(): Promise<Beacon[]> {
  return Promise.all(beacons);
}

beforeEach(() => {
  beacons = [];
  delete window.__earlyErrors;
  Object.defineProperty(navigator, 'sendBeacon', {
    configurable: true,
    value: (url: string, blob: Blob) => {
      beacons.push(blob.text().then((t) => ({url, body: JSON.parse(t)})));
      return true;
    },
  });
});

afterEach(() => {
  // Слушатели прошлых прогонов остаются на window, но молчат: их буфер уже
  // не window.__earlyErrors.
  delete window.__earlyErrors;
  Object.defineProperty(document, 'visibilityState', {configurable: true, get: () => 'visible'});
});

describe('до гидрации', () => {
  it('ошибка и отклонённый промис копятся в буфере', () => {
    boot();
    throwOnWindow(new TypeError('early-boom'));
    reject(new Error('early-reject'));

    const early = takeEarlyErrors();
    expect(early.map((e) => e.kind)).toEqual(['window_error', 'unhandled_rejection']);
    expect((early[0]!.error as Error).message).toBe('early-boom');
  });

  it('буфер не больше 20', () => {
    boot();
    for (let i = 0; i < 30; i++) throwOnWindow(new Error(`e${i}`));
    expect(takeEarlyErrors()).toHaveLength(20);
  });

  it('отказ загрузки нашего чанка — ChunkLoadError с путём без хэша и query', () => {
    boot();
    failScript('https://reinasleo.com/_next/static/chunks/app/layout-3f2a9c1b8e.js?v=17');
    const [chunk] = takeEarlyErrors();
    expect(chunk!.kind).toBe('window_error');
    expect((chunk!.error as Error).name).toBe('ChunkLoadError');
    expect((chunk!.error as Error).message).toBe('Loading script failed: /_next/static/chunks/app/layout.js');
  });

  it('картинка и чужой скрипт — не наша поломка', () => {
    boot();
    failScript('https://reinasleo.com/_next/image?url=x', 'img');
    failScript('https://mc.yandex.ru/metrika/tag.js');
    expect(takeEarlyErrors()).toEqual([]);
  });
});

describe('гидрации не было — инлайн шлёт сам', () => {
  it('на скрытии вкладки уходит одна пачка: повторы склеены, «Script error.» отброшен', async () => {
    boot('2b4f4b52');
    failScript('/_next/static/chunks/main-app-0123456789ab.js');
    throwOnWindow(new Error('boom'));
    throwOnWindow(new Error('boom'));
    throwOnWindow('Script error.');
    hideTab();
    hideTab();

    const out = await sent();
    expect(out).toHaveLength(1);
    expect(out[0]!.url).toBe('/api/client-errors');
    expect(out[0]!.body.events).toEqual([
      {kind: 'window_error', errorClass: 'ChunkLoadError', message: 'Loading script failed: /_next/static/chunks/main-app.js', frames: [], route: '/', browser: null, release: '2b4f4b52', count: 1},
      {kind: 'window_error', errorClass: 'Error', message: 'boom', frames: [], route: '/', browser: null, release: '2b4f4b52', count: 2},
    ]);
  });

  it('pagehide тоже отправляет', async () => {
    boot();
    reject('nope');
    window.dispatchEvent(new Event('pagehide'));
    const out = await sent();
    expect(out).toHaveLength(1);
    expect(out[0]!.body.events[0]).toMatchObject({kind: 'unhandled_rejection', errorClass: 'Error', message: 'nope'});
  });

  it('ошибок нет — отправки нет', async () => {
    boot();
    hideTab();
    expect(await sent()).toEqual([]);
  });

  it('релиз с чужими символами в страницу не попадает', () => {
    expect(earlyErrorsScript('</script><script>alert(1)')).toContain('release:null');
    expect(earlyErrorsScript('v1.2.3-rc+7')).toContain('release:"v1.2.3-rc+7"');
  });
});

describe('буфер забрал сборщик — инлайн молчит', () => {
  it('после takeEarlyErrors ни копить, ни слать', async () => {
    boot();
    throwOnWindow(new Error('before'));
    expect(takeEarlyErrors()).toHaveLength(1);

    throwOnWindow(new Error('after'));
    hideTab();
    expect(await sent()).toEqual([]);
    expect(takeEarlyErrors()).toEqual([]);
  });

  it('сборщик при установке забирает раннее и шлёт его сам — ровно один раз', async () => {
    vi.resetModules();
    boot();
    throwOnWindow(new Error('pre-hydration'));
    const {installClientErrorReporting} = await import('../clientErrors');
    installClientErrorReporting();
    throwOnWindow(new Error('post-hydration'));
    hideTab();

    // Одна пачка с обеими — значит, раннюю отправил сборщик. Не забери он
    // буфер, ранняя ушла бы отдельно инлайном, и пачек было бы две.
    const out = await sent();
    expect(out).toHaveLength(1);
    expect(out[0]!.body.events).toEqual([
      expect.objectContaining({kind: 'window_error', message: 'pre-hydration', count: 1}),
      expect.objectContaining({kind: 'window_error', message: 'post-hydration', count: 1}),
    ]);
  });
});

import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {afterEach, describe, it, expect, vi} from 'vitest';
import ru from '../../messages/ru.json';
import en from '../../messages/en.json';
import {
  SITE_TEXT_FIELDS,
  applyTextEdits,
  contactEmail,
  editProblem,
  getSiteTexts,
  DEFAULT_CONTACT_EMAIL,
} from './texts';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const fields = SITE_TEXT_FIELDS.flatMap((g) => g.fields);

// Белый список живёт в двух местах — здесь и в SiteTextsService.java. Разъедутся
// молча: ключ есть в форме, а сервер отвечает 400. Сверяем по исходнику.
describe('whitelist is the same on both sides', () => {
  it('keys and length limits match SiteTextsService.java', () => {
    const java = readFileSync(
      join(process.cwd(), '../api/src/main/java/com/reinasleo/api/service/SiteTextsService.java'),
      'utf8',
    );
    const serverSide = Object.fromEntries(
      [...java.matchAll(/Map\.entry\("([^"]+)", (\d+)\)/g)].map((m) => [m[1], Number(m[2])]),
    );
    expect(Object.keys(serverSide).length).toBeGreaterThanOrEqual(20); // обход жив
    expect(Object.fromEntries(fields.map((f) => [f.key, f.max]))).toEqual(serverSide);
  });

  it('every listed key exists in both dictionaries', () => {
    for (const f of fields) {
      const get = (m: unknown) => f.key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], m);
      expect(typeof get(ru), `ru ${f.key}`).toBe('string');
      expect(typeof get(en), `en ${f.key}`).toBe('string');
    }
  });
});

describe('applyTextEdits', () => {
  it('puts the edit in its own language only, leaving the dictionary untouched', () => {
    const edits = {texts: {'white.landing.theEdit': {ru: 'Выбор сезона'}}};
    const out = applyTextEdits(ru, edits, 'ru');
    expect(out.white.landing.theEdit).toBe('Выбор сезона');
    expect(ru.white.landing.theEdit).toBe('Подборка');
    expect(applyTextEdits(en, edits, 'en').white.landing.theEdit).toBe(en.white.landing.theEdit);
  });

  // Плейсхолдер потерян — next-intl упал бы на форматировании. Показываем
  // исходный текст, страница жива.
  it('an edit that lost its placeholder is ignored, not rendered', () => {
    const out = applyTextEdits(ru, {texts: {'white.pdp.preorderBody': {ru: 'Вещи нет, напишем'}}}, 'ru');
    expect(out.white.pdp.preorderBody).toBe(ru.white.pdp.preorderBody);
  });

  it('an edit keeping the placeholder is applied', () => {
    const out = applyTextEdits(ru, {texts: {'white.pdp.preorderBody': {ru: '«{name}» закончилась — напишем.'}}}, 'ru');
    expect(out.white.pdp.preorderBody).toBe('«{name}» закончилась — напишем.');
  });

  it('keys outside the list and unsafe text never reach the page', () => {
    const out = applyTextEdits(
      ru,
      {texts: {'white.pdp.addToBag': {ru: 'Купить'}, 'white.sets.title': {ru: '<b>Образы</b>'}}} as never,
      'ru',
    );
    expect(out.white.pdp.addToBag).toBe(ru.white.pdp.addToBag);
    expect(out.white.sets.title).toBe(ru.white.sets.title);
  });

  it('no edits, or an unknown locale — the dictionary as is', () => {
    expect(applyTextEdits(ru, null, 'ru')).toBe(ru);
    expect(applyTextEdits(ru, {texts: {'white.sets.title': {ru: 'x'}}}, 'de')).toBe(ru);
  });
});

describe('editProblem — what the form tells the owner before saving', () => {
  it('names the placeholder to keep', () => {
    expect(editProblem('Размер, пожелания', 'Размер {size} · комментарий', 80)).toBe('нужно оставить {size}');
    expect(editProblem('Размер {size}', 'Размер {size} · комментарий', 80)).toBeNull();
    expect(editProblem('Подборка {x}', 'Подборка', 60)).toBe('в этом тексте нет подстановок — уберите {…}');
  });
});

describe('contactEmail', () => {
  it('uses the edit when it is an address, the old one otherwise', () => {
    expect(contactEmail({texts: {}, contactEmail: 'hello@reinasleo.com'})).toBe('hello@reinasleo.com');
    expect(contactEmail({texts: {}, contactEmail: 'nope'})).toBe(DEFAULT_CONTACT_EMAIL);
    expect(contactEmail(null)).toBe(DEFAULT_CONTACT_EMAIL);
  });
});

describe('getSiteTexts', () => {
  it('asks the API tagged storefront, keeps only listed keys', async () => {
    vi.stubEnv('CATALOGUE_SOURCE', '');
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({texts: {'white.sets.title': {ru: 'Образы'}, 'offer.x': {ru: 'y'}}}), {status: 200}),
    );
    vi.stubGlobal('fetch', fetchMock);

    expect(await getSiteTexts()).toEqual({texts: {'white.sets.title': {ru: 'Образы'}}});
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, {next: {tags: string[]}}];
    expect(url).toMatch(/\/api\/site\/texts$/);
    expect(init.next.tags).toContain('storefront');
  });

  it('an unreachable API means no edits — the site shows its own texts', async () => {
    vi.stubEnv('CATALOGUE_SOURCE', '');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED'); }));
    expect(await getSiteTexts()).toBeNull();
  });
});

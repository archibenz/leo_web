import {API_BASE} from '../api';

// «Тексты сайта» — правки заголовков и подписей витрины, которые владелец
// делает сам в админке (/admin/texts). Хранятся только ПРАВКИ: нет правки —
// текст из перевода (messages/*.json). Подмешиваются в словарь next-intl на
// сервере (i18n.ts), поэтому все компоненты — серверные и клиентские —
// показывают правку без изменений в них самих.
//
// БЕЛЫЙ СПИСОК — здесь и в SiteTextsService.java, и они обязаны совпадать:
// texts.test.ts читает Java-исходник и сверяет ключи и пределы длины.

export type Locale = 'ru' | 'en';
export type LocalizedEdit = {ru?: string; en?: string};
export type SiteTextEdits = {texts: Record<string, LocalizedEdit>; contactEmail?: string};

export type SiteTextField = {key: string; label: string; max: number; hint?: string};
export type SiteTextGroup = {page: string; title: string; fields: SiteTextField[]};

export const SITE_TEXT_FIELDS: readonly SiteTextGroup[] = [
  {
    page: 'home',
    title: 'Главная',
    fields: [
      {key: 'white.landing.theEdit', label: 'Заголовок над подборкой', max: 60},
      {key: 'white.landing.houseLine', label: 'Фраза бренда курсивом', max: 160},
      {key: 'white.landing.shopCollection', label: 'Кнопка «Смотреть коллекцию»', max: 40},
      {key: 'white.sets.explore', label: 'Кнопка «Смотреть сеты»', max: 40},
    ],
  },
  {
    page: 'pdp',
    title: 'Карточка товара',
    fields: [
      {key: 'white.pdp.season', label: 'Сезон над названием', max: 40, hint: 'Один на все товары.'},
      {key: 'white.pdp.deliveryValue', label: 'Срок доставки', max: 60},
      {key: 'white.pdp.about', label: 'Заголовок «О вещи»', max: 40},
      {key: 'white.pdp.completeLook', label: 'Заголовок «Собери образ»', max: 40},
      {key: 'white.pdp.preorder', label: 'Предзаказ: кнопка', max: 30},
      {key: 'white.pdp.preorderTitle', label: 'Предзаказ: заголовок окна', max: 60},
      {key: 'white.pdp.preorderBody', label: 'Предзаказ: текст окна', max: 300, hint: '{name} — название вещи, его нужно оставить.'},
      {key: 'white.pdp.preorderNote', label: 'Предзаказ: подпись поля комментария', max: 80},
      // «Подпись поля, когда размер выбран» (preorderNoteWithSize) нарочно не
      // здесь: размер на витрине выбрать нельзя, и эта подпись не видна никогда.
      {key: 'white.pdp.preorderSubmit', label: 'Предзаказ: кнопка отправки', max: 30},
      {key: 'white.pdp.preorderSent', label: 'Предзаказ: ответ после отправки', max: 200},
    ],
  },
  {
    page: 'sets',
    title: 'Сеты',
    fields: [
      {key: 'white.sets.eyebrow', label: 'Надзаголовок', max: 40, hint: 'Эта же подпись стоит над блоком сетов на главной.'},
      {key: 'white.sets.title', label: 'Заголовок', max: 80},
      {key: 'white.sets.intro', label: 'Вводный текст', max: 400},
    ],
  },
  {
    page: 'lookbook',
    title: 'Лукбук',
    fields: [
      {key: 'white.lookbook.eyebrow', label: 'Надзаголовок (сезон)', max: 40},
      {key: 'white.lookbook.title', label: 'Заголовок', max: 80},
      {key: 'white.lookbook.intro', label: 'Вводный текст', max: 400},
    ],
  },
  {
    page: 'contact',
    title: 'Контакты',
    fields: [
      {key: 'white.contact.eyebrow', label: 'Надзаголовок', max: 40},
      {key: 'white.contact.title', label: 'Заголовок', max: 80},
      {key: 'white.contact.intro', label: 'Вводный текст', max: 400},
      {key: 'white.contact.responseTime', label: 'Срок ответа', max: 160},
    ],
  },
];

export const SITE_TEXT_KEYS: ReadonlySet<string> = new Set(SITE_TEXT_FIELDS.flatMap((g) => g.fields.map((f) => f.key)));

export const DEFAULT_CONTACT_EMAIL = 'reinasleo@gmail.com';
const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function placeholders(text: string): string[] {
  return [...new Set((text.match(/\{[A-Za-z]+\}/g) ?? []).map((p) => p.slice(1, -1)))].sort();
}

// Почему правка может не подойти — то же, что проверяет сервер, плюс то, чего
// сервер знать не может: плейсхолдеры обязаны совпасть с исходным текстом,
// иначе next-intl упадёт при форматировании. null — подходит.
export function editProblem(edit: string, original: string, max: number): string | null {
  if (edit.length > max) return `длиннее ${max} символов`;
  if (/[<>]/.test(edit)) return 'угловые скобки нельзя';
  if (edit.includes("'{") || edit.includes("}'")) return 'апостроф вплотную к {…} ломает подстановку';
  if (/[{}]/.test(edit.replace(/\{[A-Za-z]+\}/g, ''))) return 'фигурные скобки — только как {слово} из исходного текста';
  const need = placeholders(original);
  const got = placeholders(edit);
  if (need.join(',') !== got.join(',')) {
    return need.length ? `нужно оставить ${need.map((p) => `{${p}}`).join(', ')}` : 'в этом тексте нет подстановок — уберите {…}';
  }
  return null;
}

function getPath(obj: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);
}

function setPath<T>(obj: T, key: string, value: string): T {
  const [head, ...rest] = key.split('.');
  const src = (obj ?? {}) as Record<string, unknown>;
  return {...src, [head]: rest.length ? setPath(src[head], rest.join('.'), value) : value} as T;
}

// Словарь с правками. Не подошедшая правка (чужой ключ, плейсхолдеры не те,
// небезопасные символы) молча пропускается: страница показывает исходный
// текст, а не падает. Исходный словарь не меняется.
export function applyTextEdits<T>(messages: T, edits: SiteTextEdits | null, locale: string): T {
  if (!edits || (locale !== 'ru' && locale !== 'en')) return messages;
  let out = messages;
  for (const group of SITE_TEXT_FIELDS) {
    for (const field of group.fields) {
      const edit = edits.texts?.[field.key]?.[locale];
      const original = getPath(messages, field.key);
      if (typeof edit !== 'string' || !edit.trim() || typeof original !== 'string') continue;
      if (editProblem(edit.trim(), original, field.max)) continue;
      out = setPath(out, field.key, edit.trim());
    }
  }
  return out;
}

export function contactEmail(edits: SiteTextEdits | null): string {
  const email = edits?.contactEmail?.trim();
  return email && EMAIL.test(email) ? email : DEFAULT_CONTACT_EMAIL;
}

function toEdits(raw: unknown): SiteTextEdits | null {
  if (!raw || typeof raw !== 'object') return null;
  const {texts, contactEmail: email} = raw as {texts?: unknown; contactEmail?: unknown};
  const out: SiteTextEdits = {texts: {}};
  if (texts && typeof texts === 'object') {
    for (const [key, value] of Object.entries(texts as Record<string, unknown>)) {
      if (!SITE_TEXT_KEYS.has(key) || !value || typeof value !== 'object') continue;
      const {ru, en} = value as {ru?: unknown; en?: unknown};
      out.texts[key] = {...(typeof ru === 'string' ? {ru} : {}), ...(typeof en === 'string' ? {en} : {})};
    }
  }
  if (typeof email === 'string') out.contactEmail = email;
  return out;
}

// API недоступен — правок нет, сайт показывает тексты из перевода.
export async function getSiteTexts(): Promise<SiteTextEdits | null> {
  if (process.env.CATALOGUE_SOURCE === 'fixture') return null;
  try {
    const res = await fetch(`${API_BASE}/api/site/texts`, {next: {revalidate: 600, tags: ['storefront']}});
    if (!res.ok) return null;
    return toEdits(await res.json());
  } catch {
    return null;
  }
}

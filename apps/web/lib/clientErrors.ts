// Ошибки браузера → API сайта (POST /api/client-errors) → аналитика (app_error).
// Сервер сайта из RU до Telegram не достаёт, тревоги владельцу шлёт бот
// аналитики — а о поломке у покупателя без этого не узнал бы никто.
//
// Копим в памяти вкладки, повторы склеиваем со счётчиком и шлём пачкой через
// sendBeacon: на скрытие вкладки (как lib/siteEvents.ts) и через 30 с после
// первой ошибки — чтобы долгая вкладка не держала поломку у себя часами.
//
// ЧЕГО НЕ ШЛЁМ: адрес — только путь, без query и hash (в query бывают токены
// входа); ни кук, ни localStorage, ни полного User-Agent — только семейство
// браузера и мажорная версия. Текст ещё раз маскирует сервер (SecretMask).

import {takeEarlyErrors} from './earlyErrors';

const ENDPOINT = '/api/client-errors';
// Зеркало пределов ClientErrorBatchRequest: пачка ≤20, тело ≤16 КБ.
const MAX_BATCH = 20;
const MAX_MESSAGE = 500;
const MAX_FRAMES = 10;
const MAX_FRAME = 200;
const FLUSH_AFTER_MS = 30_000;

export type ClientErrorKind = 'window_error' | 'unhandled_rejection' | 'render';

export interface ClientErrorEvent {
  kind: ClientErrorKind;
  errorClass: string;
  message: string;
  frames: string[];
  route: string;
  browser: string | null;
  release?: string;
  count: number;
}

// Шум, который не наша поломка: «Script error.» — чужой скрипт с другого
// домена (браузер прячет подробности), ResizeObserver — безвредное
// предупреждение Chrome, а стек, где кадры есть, но ни одного нашего, —
// расширения браузера и Метрика. Судим по ИСХОДНОМУ стеку: отфильтрованный
// список наших кадров у такой ошибки пуст и выглядел бы как «стека нет».
export function isNoise(message: string, stack: string | undefined, origin: string): boolean {
  if (/^Script error\.?$/i.test(message.trim())) return true;
  if (/ResizeObserver loop/i.test(message)) return true;
  const hasFrames = !!stack && /(?:https?|chrome-extension|moz-extension|safari-(?:web-)?extension):\/\//.test(stack);
  return hasFrames && ourFrames(stack, origin).length === 0;
}

// Кадры стека вида «at fn (https://…/_next/static/chunks/x.js:1:200)» или
// Safari «fn@https://…:1:200» → «x.js:1:200 fn». Только наши, до 10 штук.
export function ourFrames(stack: string | undefined, origin: string): string[] {
  if (!stack) return [];
  const out: string[] = [];
  for (const line of stack.split('\n')) {
    const m = line.match(/(?:at\s+(?:(\S+)\s+\()?|^(\S*)@)(https?:\/\/[^)\s]+)\)?/);
    if (!m) continue;
    const url = m[3];
    if (!url.startsWith(origin) && !url.includes('/_next/')) continue;
    const fn = m[1] || m[2] || '';
    // Домен и query прочь (в query бывает что угодно), позиция :строка:столбец
    // остаётся — по ней ищут место в сборке; в отпечатке числа всё равно
    // нормализуются, и новая сборка не рождает «новую» ошибку.
    const [, path, pos] = url.replace(/^https?:\/\/[^/]+/, '').match(/^([^?]*)(?:\?[^:]*)?((?::\d+){0,2})$/) ?? [];
    const file = `${path ?? ''}${pos ?? ''}`;
    out.push(`${file}${fn ? ` ${fn}` : ''}`.slice(0, MAX_FRAME));
    if (out.length >= MAX_FRAMES) break;
  }
  return out;
}

// «Safari 18», «Chrome 128», «Yandex 24» — семейство и мажорная версия, не
// полный User-Agent: по нему ищут поломку, а не человека.
export function browserFamily(ua: string): string | null {
  const rules: Array<[string, RegExp]> = [
    ['Yandex', /YaBrowser\/(\d+)/],
    ['Edge', /Edg\/(\d+)/],
    ['Opera', /OPR\/(\d+)/],
    ['Firefox', /Firefox\/(\d+)/],
    ['Chrome', /Chrome\/(\d+)/],
    ['Safari', /Version\/(\d+).*Safari/],
  ];
  for (const [name, re] of rules) {
    const m = ua.match(re);
    if (m) return `${name} ${m[1]}`;
  }
  return null;
}

export function toEvent(kind: ClientErrorKind, error: unknown, loc: {origin: string; pathname: string}, ua: string): ClientErrorEvent | null {
  const err = error instanceof Error ? error : null;
  const message = (err ? err.message : typeof error === 'string' ? error : safeString(error)).slice(0, MAX_MESSAGE);
  if (isNoise(message, err?.stack, loc.origin)) return null;
  const frames = ourFrames(err?.stack, loc.origin);
  return {
    kind,
    errorClass: err?.name || 'Error',
    message,
    frames,
    route: loc.pathname,
    browser: browserFamily(ua),
    release: process.env.NEXT_PUBLIC_RELEASE || undefined,
    count: 1,
  };
}

function safeString(value: unknown): string {
  try {
    return typeof value === 'object' ? JSON.stringify(value) ?? String(value) : String(value);
  } catch {
    return String(value);
  }
}

/** Склейка повторов внутри вкладки: одна ошибка в цикле — одна строка со счётчиком. */
export class ClientErrorBuffer {
  private readonly items = new Map<string, ClientErrorEvent>();

  add(e: ClientErrorEvent): void {
    const key = [e.kind, e.errorClass, e.message, e.frames[0] ?? '', e.route].join('\u0001');
    const seen = this.items.get(key);
    if (seen) seen.count = Math.min(seen.count + 1, 1000);
    else this.items.set(key, {...e});
  }

  get size(): number {
    return this.items.size;
  }

  /** Забрать до MAX_BATCH событий; остальное остаётся на следующую отправку. */
  take(): ClientErrorEvent[] {
    const out: ClientErrorEvent[] = [];
    for (const [key, e] of this.items) {
      out.push(e);
      this.items.delete(key);
      if (out.length >= MAX_BATCH) break;
    }
    return out;
  }
}

const buffer = new ClientErrorBuffer();
let timer: ReturnType<typeof setTimeout> | null = null;
let installed = false;

function flush(): void {
  timer = null;
  while (buffer.size > 0) {
    const events = buffer.take();
    const blob = new Blob([JSON.stringify({events})], {type: 'application/json'});
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(ENDPOINT, blob);
    } else {
      void fetch(ENDPOINT, {method: 'POST', body: blob, keepalive: true}).catch(() => undefined);
    }
  }
}

export function reportClientError(kind: ClientErrorKind, error: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    const event = toEvent(kind, error, window.location, navigator.userAgent);
    if (!event) return;
    buffer.add(event);
    if (!timer) timer = setTimeout(flush, FLUSH_AFTER_MS);
  } catch {
    // Сборщик ошибок сам не имеет права ронять страницу.
  }
}

export function installClientErrorReporting(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (e) => reportClientError('window_error', e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) => reportClientError('unhandled_rejection', e.reason));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
  // Пойманное до гидрации инлайном из <head> (lib/earlyErrors.ts). Забрав
  // буфер, выключаем инлайн — иначе на скрытии вкладки ушёл бы дубль.
  for (const {kind, error} of takeEarlyErrors()) reportClientError(kind, error);
}

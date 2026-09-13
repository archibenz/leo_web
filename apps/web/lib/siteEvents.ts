import {COOKIE_CONSENT_KEY} from './cookieConsent';

// Собственный сбор поведения витрины — не замена Яндекс.Метрике (components/Metrika.tsx),
// а то, чего у неё нет: наши варианты, черновики, локальная сумка. Копим в
// памяти вкладки и шлём пачкой через sendBeacon только на visibilitychange
// (скрытие) и pagehide — до этого момента не уходит ни один запрос, отправка
// не в главном потоке отрисовки.

const ENDPOINT = '/api/events';
const SESSION_STORAGE_KEY = 'wv-site-session';
// Зеркалит лимит пачки в SiteEventBatchRequest (apps/api) — сервер всё равно
// проверяет сам, это только защита от одного sendBeacon на длинную SPA-сессию
// без единого переключения вкладки: без чанкинга такая пачка ушла бы целиком
// не пройдя валидацию, и вся история этой отправки терялась бы.
const MAX_BATCH = 20;

export type SiteEventType =
  | 'page_view'
  | 'product_view'
  | 'marketplace_click'
  | 'add_to_cart'
  | 'add_to_favourite'
  | 'checkout_start'
  | 'signup';

export interface SiteEventFields {
  productId?: string;
  modelId?: string;
  path?: string;
  locale?: string;
  device?: 'phone' | 'desktop';
  marketplace?: 'wildberries' | 'ozon';
}

interface QueuedSiteEvent extends SiteEventFields {
  eventType: SiteEventType;
  sessionKey?: string;
}

let queue: QueuedSiteEvent[] = [];

function getSessionKey(): string | undefined {
  try {
    // Решение владельца: до согласия на cookie ключ сессии не ставится —
    // событие всё равно уходит (см. trackSiteEvent), но обезличенно.
    if (localStorage.getItem(COOKIE_CONSENT_KEY) !== '1') return undefined;
    const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    sessionStorage.setItem(SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    // Хранилище недоступно (приватный режим и т.п.) — событие всё равно
    // уходит, просто без псевдонима.
    return undefined;
  }
}

export function trackSiteEvent(eventType: SiteEventType, fields: SiteEventFields = {}): void {
  // Единственная проверка doNotTrack во всём модуле — намеренно: приёмочный
  // тест мутирует именно её и ожидает покраснения ровно одного кейса.
  if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') return;
  if (typeof window === 'undefined') return;
  queue.push({eventType, sessionKey: getSessionKey(), ...fields});
}

function sendChunk(events: readonly QueuedSiteEvent[]): void {
  if (events.length === 0) return;
  const blob = new Blob([JSON.stringify({events})], {type: 'application/json'});
  navigator.sendBeacon(ENDPOINT, blob);
}

export function flushSiteEvents(): void {
  if (queue.length === 0) return;
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
    // Нет доступного транспорта — не копим бесконечно, честно бросаем пачку.
    queue = [];
    return;
  }
  const pending = queue;
  queue = [];
  for (let i = 0; i < pending.length; i += MAX_BATCH) {
    sendChunk(pending.slice(i, i + MAX_BATCH));
  }
}

let listenersBound = false;

function bindFlushListeners(): void {
  if (listenersBound || typeof document === 'undefined') return;
  listenersBound = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSiteEvents();
  });
  window.addEventListener('pagehide', () => flushSiteEvents());
}

bindFlushListeners();

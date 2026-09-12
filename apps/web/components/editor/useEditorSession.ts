'use client';

import {useEffect, useState} from 'react';
import {apiFetch, getToken} from '../../lib/api';

// Витрина живёт БЕЗ AuthProvider: в layout им обёрнута только градиентная
// ветка (admin и auth). Оборачивать ею весь магазин ради одной кнопки — значит
// поднимать на каждой странице контексты корзины и избранного, которых у
// витрины свои. Поэтому здесь своя, узкая проверка: нужен ровно ответ на
// вопрос «этот посетитель — редактор?».
//
// Это ТОЛЬКО про показ кнопки. Право на черновик даёт бэкенд: ручка
// предпросмотра лежит под ROLE_ADMIN, и посторонний не получит черновых данных,
// даже если нарисует себе кнопку в консоли.
//
// ЦЕНА ЗАПРОСА ЗДЕСЬ — НЕ МЕЛОЧЬ, И ПОЭТОМУ ОН ОДИН.
// `/api/auth/**` лимитирован десятью запросами в минуту на IP. Хук зовут два
// одновременно смонтированных компонента (переключатель в чроме и полоса режима
// внутри провайдера); без общего обещания оба эффекта стартовали бы в одном
// такте, оба увидели бы пустой кэш и оба ушли бы в сеть — по два из десяти на
// каждую перезагрузку. Отсюда дедупликация на уровне модуля.
//
// Неудача тоже запоминается — но только в памяти модуля, на минуту, и
// НАМЕРЕННО не в sessionStorage. Настоящая перезагрузка страницы обнулит эту
// переменную вместе со всем JS в любом случае — это не защита от перезагрузок,
// а защита от несколько раз подряд смонтированных внутри ОДНОЙ загрузки
// компонентов. Закрепить отказ переживающим перезагрузку было бы хуже: одна
// сетевая икота (429) выключила бы кнопку правки на весь сеанс владельца, а
// не на минуту.

type Session = {checked: boolean; isAdmin: boolean};

const ANONYMOUS: Session = {checked: true, isAdmin: false};

// Ответ живёт до конца вкладки: иначе каждая навигация по витрине стоила бы
// залогиненному покупателю лишнего запроса.
const CACHE_KEY = 'reinasleo_editor_role';
// Окно лимитера — минута; столько же не трогаем ручку после отказа.
const FAILURE_TTL_MS = 60_000;

let inFlight: Promise<boolean> | null = null;
let silentUntil = 0;

function remembered(): boolean | null {
  try {
    const value = sessionStorage.getItem(CACHE_KEY);
    return value === null ? null : value === 'admin';
  } catch {
    return null;
  }
}

function remember(isAdmin: boolean): void {
  try {
    sessionStorage.setItem(CACHE_KEY, isAdmin ? 'admin' : 'no');
  } catch {
    /* приватный режим — просто спросим снова */
  }
}

/** Одно обещание на всех: сколько бы компонентов ни спросило, запрос уйдёт один. */
function resolveRole(): Promise<boolean> {
  const cached = remembered();
  if (cached !== null) return Promise.resolve(cached);
  if (Date.now() < silentUntil) return Promise.resolve(false);
  if (inFlight === null) {
    inFlight = apiFetch<{role?: string}>('/api/auth/me', {skipAuthHandler: true})
      .then((me) => {
        const isAdmin = me.role === 'admin';
        remember(isAdmin);
        return isAdmin;
      })
      .catch(() => {
        silentUntil = Date.now() + FAILURE_TTL_MS;
        return false;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export function useEditorSession(): Session {
  const [session, setSession] = useState<Session>({checked: false, isAdmin: false});

  useEffect(() => {
    // Нет токена — нет и сессии: вход кладёт его в localStorage в любом из
    // путей (почта, Telegram). Анонимный посетитель не стоит ни одного запроса.
    if (!getToken()) {
      setSession(ANONYMOUS);
      return;
    }
    let alive = true;
    void resolveRole().then((isAdmin) => {
      if (alive) setSession({checked: true, isAdmin});
    });
    return () => {
      alive = false;
    };
  }, []);

  return session;
}

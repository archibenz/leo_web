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

type Session = {checked: boolean; isAdmin: boolean};

const ANONYMOUS: Session = {checked: true, isAdmin: false};

// Ответ живёт до конца вкладки. Без этого каждая навигация по витрине стоила
// бы залогиненному покупателю лишнего запроса к /api/auth/me.
const CACHE_KEY = 'reinasleo_editor_role';

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

export function useEditorSession(): Session {
  const [session, setSession] = useState<Session>({checked: false, isAdmin: false});

  useEffect(() => {
    // Нет токена — нет и сессии: вход кладёт его в localStorage в любом из
    // путей (почта, Telegram). Анонимный посетитель не стоит ни одного запроса.
    if (!getToken()) {
      setSession(ANONYMOUS);
      return;
    }
    const cached = remembered();
    if (cached !== null) {
      setSession({checked: true, isAdmin: cached});
      return;
    }
    let alive = true;
    apiFetch<{role?: string}>('/api/auth/me', {skipAuthHandler: true})
      .then((me) => {
        const isAdmin = me.role === 'admin';
        remember(isAdmin);
        if (alive) setSession({checked: true, isAdmin});
      })
      .catch(() => {
        if (alive) setSession(ANONYMOUS);
      });
    return () => {
      alive = false;
    };
  }, []);

  return session;
}

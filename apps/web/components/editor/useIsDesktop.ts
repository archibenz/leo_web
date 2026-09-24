'use client';

import {useSyncExternalStore} from 'react';

// Правка витрины — только на компьютере (решение владельца 24.09): на экранах
// уже 1024 px нет ни выключателя, ни точек правки, сайт только для чтения.
//
// По ШИРИНЕ, а не по user-agent: планшет, повёрнутый боком, и узкое окно на
// компьютере обязаны вести себя по тому, сколько места на экране, а не по
// тому, как браузер себя назвал.
//
// С ПОДПИСКОЙ на изменение: окно сузили или телефон повернули — режим
// выключается сразу, без перезагрузки.
//
// ТРИ СОСТОЯНИЯ, А НЕ ДВА. Сервер ширины не знает, и до гидратации она
// «неизвестна». Приравнять её к телефону нельзя: полоса режима сказала бы на
// компьютере «править можно с компьютера», пусть и на кадр. Приравнять к
// компьютеру — тоже: на телефоне на кадр встали бы инструменты. Поэтому
// «неизвестно» — своё состояние: инструментов нет, а слова — те, что верны на
// любом экране.
export const DESKTOP_QUERY = '(min-width: 1024px)';

export type Viewport = 'desktop' | 'narrow' | 'unknown';

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function snapshot(): Viewport {
  return window.matchMedia(DESKTOP_QUERY).matches ? 'desktop' : 'narrow';
}

function serverSnapshot(): Viewport {
  return 'unknown';
}

export function useViewport(): Viewport {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

export function useIsDesktop(): boolean {
  return useViewport() === 'desktop';
}

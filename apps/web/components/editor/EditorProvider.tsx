'use client';

import {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import type {StorefrontBrokenDraft} from '../../lib/catalogue/types';
import EditorPanel from './EditorPanel';
import EditorNotice from './EditorNotice';
import type {DraftKind, EditorTarget} from './types';

type EditorContextValue = {
  // Сервер отдал черновик. Единственный признак, которому можно верить: он
  // означает, что бэкенд признал эту сессию редактором. Кнопка в шапке — нет.
  editing: boolean;
  target: EditorTarget | null;
  open: (target: EditorTarget) => void;
  close: () => void;
  brokenDrafts: StorefrontBrokenDraft[];
  brokenFor: (kind: DraftKind, id: string) => StorefrontBrokenDraft | undefined;
  refresh: () => void;
};

// Витрина без провайдера — обычный магазин. Значение по умолчанию нужно, чтобы
// точки редактирования можно было расставить в компонентах, которые рендерятся
// и вне режима (и в тестах витрины, где провайдера нет).
const CLOSED: EditorContextValue = {
  editing: false,
  target: null,
  open: () => {},
  close: () => {},
  brokenDrafts: [],
  brokenFor: () => undefined,
  refresh: () => {},
};

const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor(): EditorContextValue {
  return useContext(EditorContext) ?? CLOSED;
}

/**
 * Обёртка страницы в режиме редактирования.
 *
 * Живёт в СТРАНИЦЕ, а не в чроме: только страница знает, отдал ли сервер
 * черновик. Шапка про это не знает и знать не должна — её переключатель лишь
 * ставит флаг в адрес.
 */
export function EditorProvider({editing, brokenDrafts = [], children}: {
  editing: boolean;
  brokenDrafts?: StorefrontBrokenDraft[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<EditorTarget | null>(null);

  const brokenFor = useCallback(
    (kind: DraftKind, id: string) => brokenDrafts.find((b) => b.kind === kind && (b.id === id || b.key === id)),
    [brokenDrafts],
  );

  // Перерисовка сервером, а не правка состояния на клиенте: предпросмотр
  // собирает бэкенд той же функцией слияния, которой публикует. Показать
  // «как будет» своими силами значит завести вторую правду.
  const refresh = useCallback(() => router.refresh(), [router]);

  const value = useMemo<EditorContextValue>(
    () => ({
      editing,
      target: editing ? target : null,
      open: setTarget,
      close: () => setTarget(null),
      brokenDrafts,
      brokenFor,
      refresh,
    }),
    [editing, target, brokenDrafts, brokenFor, refresh],
  );

  // Панель занимает правую колонку на широком экране — содержимое уезжает
  // влево, а не прячется под ней. На телефоне это нижняя полка, и страница
  // получает запас снизу, чтобы её низ оставался достижимым.
  const shifted = editing && target !== null;

  return (
    <EditorContext.Provider value={value}>
      <div className={shifted ? 'transition-[padding] duration-200 motion-reduce:transition-none max-lg:pb-[62vh] lg:pr-[360px]' : ''}>
        <EditorNotice editing={editing} />
        {children}
      </div>
      <EditorPanel />
    </EditorContext.Provider>
  );
}

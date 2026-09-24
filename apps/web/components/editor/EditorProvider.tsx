'use client';

import {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import type {StorefrontBrokenDraft, WhiteProduct} from '../../lib/catalogue/types';
import {defaultLocale} from '../../i18n-routing';
import EditorPanel from './EditorPanel';
import EditorNotice from './EditorNotice';
import {useViewport} from './useIsDesktop';
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
  // Локаль страницы и полный каталог — нужны TickerForm (лист «Куда ведёт»:
  // /<locale>/... и /<locale>/product/<slug>). Уже есть на странице
  // (storefrontForViewer), поэтому проброшены пропом, а не второй ручкой.
  locale: string;
  products: WhiteProduct[];
  // Сколько точек правки на ЭТОЙ странице. Считается тем, что каждая точка
  // сама отмечается при появлении: список правится в шести местах на весь
  // сайт, и число, посчитанное руками, разошлось бы с настоящим в первый же
  // раз, когда точку добавят или уберут.
  editableCount: number;
  registerEditable: (id: string) => void;
  unregisterEditable: (id: string) => void;
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
  locale: defaultLocale,
  products: [],
  editableCount: 0,
  registerEditable: () => {},
  unregisterEditable: () => {},
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
 * ставит флаг в адрес (или куку).
 *
 * wantsEdit по умолчанию равен editing: если сервер отдал черновик, значит
 * черновик и хотели, а страницы/тесты, которым нечестный баннер безразличен
 * (editing решает всё сам), могут не передавать его вовсе. Кто заботится о
 * баннере — например, страница — передаёт СВОЙ wantsEdit из
 * storefrontForViewer явно, потому что default тут в лучшем случае угадывает.
 */
export function EditorProvider({editing, wantsEdit = editing, brokenDrafts = [], locale = defaultLocale, products = [], children}: {
  editing: boolean;
  wantsEdit?: boolean;
  brokenDrafts?: StorefrontBrokenDraft[];
  locale?: string;
  products?: WhiteProduct[];
  children: ReactNode;
}) {
  const router = useRouter();
  // Правка — только на компьютере (useIsDesktop.ts). Сервер ширины не знает и
  // черновик отдаёт по куке; здесь решается, можно ли его ПРАВИТЬ. На узком
  // экране не работает ни одна точка правки, панель не открывается. Пока
  // ширина неизвестна (до гидратации) — тоже: инструменты появятся кадром позже.
  const viewport = useViewport();
  const canEdit = editing && viewport === 'desktop';
  const [target, setTarget] = useState<EditorTarget | null>(null);
  // Множество, а не счётчик: React в строгом режиме монтирует дважды, и
  // счётчик показал бы удвоенное число. Одинаковый идентификатор дважды в
  // множество не ляжет.
  const [editableIds, setEditableIds] = useState<readonly string[]>([]);

  const registerEditable = useCallback((id: string) => {
    setEditableIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);
  const unregisterEditable = useCallback((id: string) => {
    setEditableIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev));
  }, []);

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
      editing: canEdit,
      target: canEdit ? target : null,
      open: setTarget,
      close: () => setTarget(null),
      brokenDrafts,
      brokenFor,
      refresh,
      locale,
      products,
      editableCount: editableIds.length,
      registerEditable,
      unregisterEditable,
    }),
    [canEdit, target, brokenDrafts, brokenFor, refresh, locale, products, editableIds, registerEditable, unregisterEditable],
  );

  // Панель занимает правую колонку на широком экране — содержимое уезжает
  // влево, а не прячется под ней. На телефоне это нижняя полка, и страница
  // получает запас снизу, чтобы её низ оставался достижимым.
  const shifted = canEdit && target !== null;

  return (
    <EditorContext.Provider value={value}>
      <div className={shifted ? 'transition-[padding] duration-200 motion-reduce:transition-none max-lg:pb-[62vh] lg:pr-[360px]' : ''}>
        {/* Полосе — решение СЕРВЕРА (editing), а не canEdit: на телефоне
            черновик отдан, и полоса обязана это сказать, пусть и без
            инструментов (readOnly). С canEdit=false она решила бы, что сервер
            отказал сессии, и сказала бы неправду. */}
        <EditorNotice editing={editing} wantsEdit={wantsEdit} readOnly={viewport === 'narrow'} />
        {children}
      </div>
      <EditorPanel />
    </EditorContext.Provider>
  );
}

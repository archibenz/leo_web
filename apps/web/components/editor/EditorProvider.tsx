'use client';

import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {useLoadingRouter as useRouter} from '@/components/loading/useLoadingRouter';
import type {StorefrontBrokenDraft, StorefrontSection, WhiteProduct} from '../../lib/catalogue/types';
import {defaultLocale} from '../../i18n-routing';
import EditorPanel from './EditorPanel';
import EditorNotice from './EditorNotice';
import {useViewport} from './useIsDesktop';
import {workspaceCopy} from './workspaceCopy';
import type {DraftKind, EditorTarget} from './types';
import styles from './EditorWorkspace.module.css';

export type EditorTab = 'blocks' | 'properties' | 'changes';
export type EditorFormState = {dirty: boolean; busy: boolean; reset: () => void};
export type EditableRegion = {
  id: string;
  label: string;
  owner: {kind: DraftKind; id: string};
  getTarget: () => EditorTarget;
  getElement: () => HTMLElement | null;
};

type EditorContextValue = {
  editing: boolean;
  sessionEditing: boolean;
  target: EditorTarget | null;
  selectedRegion: string | null;
  open: (target: EditorTarget, regionId?: string) => void;
  close: () => void;
  regions: EditableRegion[];
  selectRegion: (id: string) => void;
  tab: EditorTab;
  setTab: (tab: EditorTab) => void;
  formState: EditorFormState;
  setFormState: (state: EditorFormState) => void;
  operationBusy: boolean;
  setOperationBusy: (busy: boolean) => void;
  guardMessage: string | null;
  canLeave: () => boolean;
  discardLocal: () => void;
  clearDiscardedTarget: (kind: DraftKind, id: string) => void;
  brokenDrafts: StorefrontBrokenDraft[];
  brokenFor: (kind: DraftKind, id: string) => StorefrontBrokenDraft | undefined;
  refresh: () => void;
  locale: string;
  products: WhiteProduct[];
  editableCount: number;
  registerEditable: (region: EditableRegion) => void;
  unregisterEditable: (id: string) => void;
};

const EMPTY_FORM: EditorFormState = {dirty: false, busy: false, reset: () => {}};
const CLOSED: EditorContextValue = {
  editing: false, sessionEditing: false, target: null, selectedRegion: null,
  open: () => {}, close: () => {}, regions: [], selectRegion: () => {},
  tab: 'blocks', setTab: () => {}, formState: EMPTY_FORM, setFormState: () => {},
  operationBusy: false, setOperationBusy: () => {}, guardMessage: null,
  canLeave: () => true, discardLocal: () => {}, clearDiscardedTarget: () => {},
  brokenDrafts: [], brokenFor: () => undefined, refresh: () => {},
  locale: defaultLocale, products: [], editableCount: 0,
  registerEditable: () => {}, unregisterEditable: () => {},
};
const EditorContext = createContext<EditorContextValue | null>(null);
export function useEditor(): EditorContextValue {
  return useContext(EditorContext) ?? CLOSED;
}

export function sameEditorTarget(left: EditorTarget | null, right: EditorTarget) {
  return left?.kind === right.kind && left.id === right.id &&
    (left.kind !== 'variant' || right.kind !== 'variant' || left.modelId === right.modelId);
}

export function EditorProvider({editing, wantsEdit = editing, brokenDrafts = [], locale = defaultLocale, products = [], children}: {
  editing: boolean;
  wantsEdit?: boolean;
  brokenDrafts?: StorefrontBrokenDraft[];
  locale?: string;
  products?: WhiteProduct[];
  children: ReactNode;
}) {
  const router = useRouter();
  const viewport = useViewport();
  const canEdit = editing && viewport === 'desktop';
  const copy = workspaceCopy(locale);
  const [target, setTarget] = useState<EditorTarget | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [regions, setRegions] = useState<EditableRegion[]>([]);
  const [tab, setTab] = useState<EditorTab>('blocks');
  const [formState, updateFormState] = useState<EditorFormState>(EMPTY_FORM);
  const [operationBusy, setOperationBusy] = useState(false);
  const [guardMessage, setGuardMessage] = useState<string | null>(null);
  const discardedSections = useRef(new Map<string, StorefrontSection[]>());

  const setFormState = useCallback((next: EditorFormState) => {
    updateFormState((previous) => previous.dirty === next.dirty && previous.busy === next.busy && previous.reset === next.reset ? previous : next);
    if (!next.busy) setGuardMessage(null);
  }, []);
  const registerEditable = useCallback((region: EditableRegion) => {
    setRegions((previous) => [...previous.filter((item) => item.id !== region.id), region]);
  }, []);
  const unregisterEditable = useCallback((id: string) => {
    setRegions((previous) => previous.filter((region) => region.id !== id));
  }, []);

  const canLeave = useCallback(() => {
    if (formState.busy || operationBusy) {
      setGuardMessage(copy.busyHint);
      return false;
    }
    if (formState.dirty && !window.confirm(copy.leaveConfirm)) return false;
    setGuardMessage(null);
    return true;
  }, [copy, formState, operationBusy]);
  const isFreshTarget = useCallback((next: EditorTarget) => {
    if (next.kind !== 'section') return true;
    if (discardedSections.current.get(next.id)?.includes(next.section)) {
      setGuardMessage(copy.refreshPending);
      return false;
    }
    discardedSections.current.delete(next.id);
    return true;
  }, [copy]);
  const open = useCallback((next: EditorTarget, regionId?: string) => {
    if (!canEdit) return;
    if (!isFreshTarget(next)) return;
    if (regionId === selectedRegion && sameEditorTarget(target, next)) {setTab('properties'); return;}
    if (!canLeave()) return;
    setTarget(next);
    setSelectedRegion(regionId ?? null);
    setTab('properties');
  }, [canEdit, canLeave, isFreshTarget, selectedRegion, target]);
  const close = useCallback(() => {
    if (!canLeave()) return;
    setTarget(null);
    setSelectedRegion(null);
    setTab('blocks');
  }, [canLeave]);
  const selectRegion = useCallback((id: string) => {
    const region = regions.find((item) => item.id === id);
    if (!region) return;
    const next = region.getTarget();
    if (!isFreshTarget(next)) return;
    if ((id !== selectedRegion || !sameEditorTarget(target, next)) && !canLeave()) return;
    setTarget(next);
    setSelectedRegion(id);
    setTab('properties');
    region.getElement()?.scrollIntoView({block: 'center', behavior: 'auto'});
    region.getElement()?.focus({preventScroll: true});
  }, [canLeave, isFreshTarget, regions, selectedRegion, target]);
  const discardLocal = useCallback(() => {
    if (formState.busy || operationBusy || !formState.dirty) return;
    if (window.confirm(copy.discardLocalConfirm)) formState.reset();
  }, [copy, formState, operationBusy]);
  const clearDiscardedTarget = useCallback((kind: DraftKind, id: string) => {
    if (kind === 'section') {
      const snapshots = regions.map((region) => region.getTarget())
        .filter((item): item is Extract<EditorTarget, {kind: 'section'}> => item.kind === 'section' && item.id === id)
        .map((item) => item.section);
      discardedSections.current.set(id, snapshots);
    }
    if (!target) return;
    const ownerKind = target.kind === 'variant' ? 'model' : target.kind;
    const ownerId = target.kind === 'variant' ? target.modelId : target.id;
    if (kind === ownerKind && id === ownerId) {setTarget(null); setSelectedRegion(null);}
  }, [target, regions]);

  useEffect(() => {
    if (!editing) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!formState.dirty && !formState.busy && !operationBusy) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const beforeLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const element = event.target instanceof Element ? event.target : null;
      const link = element?.closest<HTMLAnchorElement>('a[href]');
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
      if (element?.closest('[data-editor-select]')) return;
      const url = new URL(link.href, window.location.href);
      if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
      if (!canLeave()) {event.preventDefault(); event.stopPropagation();}
      else if (formState.dirty) formState.reset();
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', beforeLink, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', beforeLink, true);
    };
  }, [editing, canLeave, formState, operationBusy]);

  const brokenFor = useCallback(
    (kind: DraftKind, id: string) => brokenDrafts.find((item) => item.kind === kind && (item.id === id || item.key === id)),
    [brokenDrafts],
  );
  const refresh = useCallback(() => router.refresh(), [router]);
  const value = useMemo<EditorContextValue>(() => ({
    editing: canEdit, sessionEditing: editing, target, selectedRegion, open, close,
    regions, selectRegion, tab, setTab, formState, setFormState, operationBusy,
    setOperationBusy, guardMessage, canLeave, discardLocal, clearDiscardedTarget,
    brokenDrafts, brokenFor, refresh, locale, products, editableCount: regions.length,
    registerEditable, unregisterEditable,
  }), [canEdit, editing, target, selectedRegion, open, close, regions, selectRegion, tab, formState,
    setFormState, operationBusy, guardMessage, canLeave, discardLocal, clearDiscardedTarget, brokenDrafts,
    brokenFor, refresh, locale, products, registerEditable, unregisterEditable]);

  return <EditorContext.Provider value={value}>
    <div data-editor-preview={canEdit ? '' : undefined} className={canEdit ? styles.preview : undefined}>
      <EditorNotice editing={editing} wantsEdit={wantsEdit} readOnly={viewport === 'narrow'} />
      {children}
    </div>
    <EditorPanel />
  </EditorContext.Provider>;
}

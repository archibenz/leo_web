import {useEffect, useState} from 'react';

// Variant 2 "White" — client-only bag, backed by localStorage. The /white
// portals are client-mount-gated (useWhitePortal), so there is no SSR of this
// state and no hydration mismatch. A module-level store + pub/sub keeps every
// useWhiteBag() instance on a page in sync (header count, PDP add, bag list).
// Honest demo bag: it holds the user's picks locally — there is no checkout.

const KEY = 'wv-bag';

export type WhiteBagItem = {
  id: string; // stable: `${key}-${size}-${colorEn}` so product+size+colour consolidates
  key: number;
  en: string;
  ru: string;
  price: number;
  size: string;
  colorEn: string; // chosen colourway (localised pair stored for display-independence)
  colorRu: string;
  qty: number;
};

const lineId = (key: number, size: string, colorEn: string) => `${key}-${size}-${colorEn}`;

let items: WhiteBagItem[] = [];
let loaded = false;
const listeners = new Set<(_next: readonly WhiteBagItem[]) => void>();

// Normalise persisted data: legacy rows may lack qty or use old composite ids,
// and duplicates must merge into a single line keyed by product+size.
function normalise(raw: unknown): WhiteBagItem[] {
  if (!Array.isArray(raw)) return [];
  const byLine = new Map<string, WhiteBagItem>();
  for (const r of raw as WhiteBagItem[]) {
    if (r == null || typeof r.key !== 'number' || typeof r.size !== 'string') continue;
    // Legacy rows (added before colour tracking) carry no colour — keep them as
    // an empty colourway so they survive the migration without merging.
    const colorEn = typeof r.colorEn === 'string' ? r.colorEn : '';
    const colorRu = typeof r.colorRu === 'string' ? r.colorRu : '';
    const id = lineId(r.key, r.size, colorEn);
    const qty = Number.isFinite(r.qty) && r.qty > 0 ? Math.floor(r.qty) : 1;
    const existing = byLine.get(id);
    if (existing) existing.qty += qty;
    else byLine.set(id, {id, key: r.key, en: r.en, ru: r.ru, price: r.price, size: r.size, colorEn, colorRu, qty});
  }
  return [...byLine.values()];
}

function load(): void {
  if (loaded) return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) items = normalise(JSON.parse(raw));
  } catch {
    /* corrupt / unavailable storage — start empty */
  }
}

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable — keep in-memory only */
  }
  const snapshot = [...items];
  for (const listener of listeners) listener(snapshot);
}

// Re-read the bag from localStorage and broadcast — used when another tab
// mutated it (the `storage` event fires only in other tabs).
function syncFromStorage(): void {
  try {
    const raw = localStorage.getItem(KEY);
    items = raw ? normalise(JSON.parse(raw)) : [];
  } catch {
    items = [];
  }
  const snapshot = [...items];
  for (const listener of listeners) listener(snapshot);
}

// Bind the cross-tab listener once for the page lifetime (key===null on clear).
let storageBound = false;
function ensureStorageSync(): void {
  if (storageBound || typeof window === 'undefined') return;
  storageBound = true;
  window.addEventListener('storage', (e) => {
    if (e.key === KEY || e.key === null) syncFromStorage();
  });
}

export function addToWhiteBag(item: Omit<WhiteBagItem, 'id' | 'qty'>): void {
  const id = lineId(item.key, item.size, item.colorEn);
  const existing = items.find((i) => i.id === id);
  if (existing) {
    items = items.map((i) => (i.id === id ? {...i, qty: i.qty + 1} : i));
  } else {
    items = [...items, {...item, id, qty: 1}];
  }
  persist();
}

export function setWhiteBagQty(id: string, qty: number): void {
  const next = Math.max(1, Math.floor(qty));
  let changed = false;
  items = items.map((i) => {
    if (i.id !== id || i.qty === next) return i;
    changed = true;
    return {...i, qty: next};
  });
  if (changed) persist();
}

export function removeFromWhiteBag(id: string): void {
  const next = items.filter((i) => i.id !== id);
  if (next.length === items.length) return;
  items = next;
  persist();
}

export function useWhiteBag() {
  const [snapshot, setSnapshot] = useState<readonly WhiteBagItem[]>([]);

  useEffect(() => {
    load();
    ensureStorageSync();
    setSnapshot([...items]);
    const listener = (next: readonly WhiteBagItem[]) => setSnapshot(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    items: snapshot,
    count: snapshot.reduce((sum, i) => sum + i.qty, 0),
    add: addToWhiteBag,
    setQty: setWhiteBagQty,
    remove: removeFromWhiteBag,
  };
}

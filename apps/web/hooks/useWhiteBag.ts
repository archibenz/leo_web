import {useEffect, useState} from 'react';

// Variant 2 "White" — client-only bag, backed by localStorage. The /white
// portals are client-mount-gated (useWhitePortal), so there is no SSR of this
// state and no hydration mismatch. A module-level store + pub/sub keeps every
// useWhiteBag() instance on a page in sync (header count, PDP add, bag list).
// Honest demo bag: it holds the user's picks locally — there is no checkout.

const KEY = 'wv-bag';

export type WhiteBagItem = {
  id: string;
  key: number;
  en: string;
  ru: string;
  price: number;
  size: string;
};

let items: WhiteBagItem[] = [];
let loaded = false;
const listeners = new Set<(_next: readonly WhiteBagItem[]) => void>();

function load(): void {
  if (loaded) return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) items = JSON.parse(raw) as WhiteBagItem[];
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

export function addToWhiteBag(item: Omit<WhiteBagItem, 'id'>): void {
  items = [...items, {...item, id: `${item.key}-${item.size}-${items.length}-${Date.now()}`}];
  persist();
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
    setSnapshot([...items]);
    const listener = (next: readonly WhiteBagItem[]) => setSnapshot(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    items: snapshot,
    count: snapshot.length,
    add: addToWhiteBag,
    remove: removeFromWhiteBag,
  };
}

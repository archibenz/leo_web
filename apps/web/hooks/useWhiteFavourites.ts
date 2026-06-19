import {useEffect, useState} from 'react';

// Variant 2 "White" — client-only wishlist, backed by localStorage. Mirrors
// useWhiteBag (module store + pub/sub) so every useWhiteFavourites() instance on
// a page stays in sync (header count, PDP heart, favourites list). Stores just
// the product keys — the catalog (products.ts) is the source of the rest.
// Honest: the heart persists, so a saved item is still saved after navigation.

const KEY = 'wv-favourites';

let keys: number[] = [];
let loaded = false;
const listeners = new Set<(_next: readonly number[]) => void>();

// Persisted data may be malformed (old shape, strings, duplicates) — keep only
// finite numbers, deduped, order preserved.
function normalise(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const out: number[] = [];
  for (const r of raw) {
    const n = typeof r === 'number' ? r : Number(r);
    if (Number.isFinite(n) && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

function load(): void {
  if (loaded) return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) keys = normalise(JSON.parse(raw));
  } catch {
    /* corrupt / unavailable storage — start empty */
  }
}

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(keys));
  } catch {
    /* storage unavailable — keep in-memory only */
  }
  const snapshot = [...keys];
  for (const listener of listeners) listener(snapshot);
}

export function isWhiteFavourite(key: number): boolean {
  load();
  return keys.includes(key);
}

export function toggleWhiteFavourite(key: number): void {
  if (!Number.isFinite(key)) return;
  keys = keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key];
  persist();
}

export function removeWhiteFavourite(key: number): void {
  if (!keys.includes(key)) return;
  keys = keys.filter((k) => k !== key);
  persist();
}

export function useWhiteFavourites() {
  const [snapshot, setSnapshot] = useState<readonly number[]>([]);

  useEffect(() => {
    load();
    setSnapshot([...keys]);
    const listener = (next: readonly number[]) => setSnapshot(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    keys: snapshot,
    count: snapshot.length,
    has: (key: number) => snapshot.includes(key),
    toggle: toggleWhiteFavourite,
    remove: removeWhiteFavourite,
  };
}

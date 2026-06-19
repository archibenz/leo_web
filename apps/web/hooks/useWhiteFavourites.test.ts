import {afterEach, describe, it, expect} from 'vitest';
import {toggleWhiteFavourite, removeWhiteFavourite, isWhiteFavourite} from './useWhiteFavourites';

// jsdom has no localStorage — install the same in-memory mock the bag store
// test uses, then assert through localStorage and drain it after each test.
const lsStore = new Map<string, string>();
const mockLocalStorage = {
  clear: () => lsStore.clear(),
  getItem: (k: string) => (lsStore.has(k) ? lsStore.get(k)! : null),
  setItem: (k: string, v: string) => {
    lsStore.set(k, String(v));
  },
  removeItem: (k: string) => {
    lsStore.delete(k);
  },
  key: (i: number) => Array.from(lsStore.keys())[i] ?? null,
  get length() {
    return lsStore.size;
  },
};
Object.defineProperty(globalThis, 'localStorage', {value: mockLocalStorage, configurable: true, writable: true});
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {value: mockLocalStorage, configurable: true, writable: true});
}

const readFavs = (): number[] => {
  try {
    return JSON.parse(localStorage.getItem('wv-favourites') ?? '[]') as number[];
  } catch {
    return [];
  }
};

afterEach(() => {
  readFavs().forEach((k) => removeWhiteFavourite(k));
  localStorage.clear();
});

describe('useWhiteFavourites store', () => {
  it('toggles a key on, persisting it', () => {
    toggleWhiteFavourite(3);
    expect(readFavs()).toEqual([3]);
    expect(isWhiteFavourite(3)).toBe(true);
  });

  it('toggles the same key off again', () => {
    toggleWhiteFavourite(3);
    toggleWhiteFavourite(3);
    expect(readFavs()).toEqual([]);
    expect(isWhiteFavourite(3)).toBe(false);
  });

  it('keeps distinct keys and never duplicates', () => {
    toggleWhiteFavourite(1);
    toggleWhiteFavourite(2);
    toggleWhiteFavourite(1); // off
    toggleWhiteFavourite(1); // on again
    expect(readFavs()).toEqual([2, 1]);
  });

  it('remove drops a key and ignores unknown ones', () => {
    toggleWhiteFavourite(5);
    toggleWhiteFavourite(6);
    removeWhiteFavourite(5);
    removeWhiteFavourite(999);
    expect(readFavs()).toEqual([6]);
  });

  it('persists under the wv-favourites key', () => {
    toggleWhiteFavourite(4);
    expect(localStorage.getItem('wv-favourites')).toBe('[4]');
  });
});

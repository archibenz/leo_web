import {afterEach, describe, it, expect} from 'vitest';
import {renderHook, act} from '@testing-library/react';
import {addToWhiteBag, setWhiteBagQty, removeFromWhiteBag, useWhiteBag, type WhiteBagItem} from './useWhiteBag';

// jsdom here doesn't provide localStorage (and Node's experimental one is off),
// so install an in-memory mock — same pattern as lib/__tests__/useSyncedList.
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

// The mutators operate on the module store and persist to localStorage, so we
// assert through localStorage and drain it after each test. (No hook mount, so
// the load/normalise path isn't exercised here — only the user-facing mutators.)
const readBag = (): WhiteBagItem[] => {
  try {
    return JSON.parse(localStorage.getItem('wv-bag') ?? '[]') as WhiteBagItem[];
  } catch {
    return [];
  }
};

const sample = (over: Partial<Omit<WhiteBagItem, 'id' | 'qty'>> = {}) => ({
  key: 1,
  en: 'Silk Column Dress',
  ru: 'Шёлковое платье-колонна',
  price: 24500,
  size: 'M',
  colorEn: 'Black',
  colorRu: 'Чёрный',
  ...over,
});

afterEach(() => {
  readBag().forEach((i) => removeFromWhiteBag(i.id));
  localStorage.clear();
});

describe('useWhiteBag store', () => {
  it('adds an item with qty 1 and a key-size-colour id', () => {
    addToWhiteBag(sample());
    const bag = readBag();
    expect(bag).toHaveLength(1);
    expect(bag[0]).toMatchObject({key: 1, size: 'M', qty: 1, colorEn: 'Black', id: '1-M-Black'});
  });

  it('keeps different colours of the same product+size as separate lines', () => {
    addToWhiteBag(sample({colorEn: 'Black', colorRu: 'Чёрный'}));
    addToWhiteBag(sample({colorEn: 'Ivory', colorRu: 'Слоновая кость'}));
    const bag = readBag();
    expect(bag).toHaveLength(2);
    expect(bag.map((i) => i.colorEn).sort()).toEqual(['Black', 'Ivory']);
  });

  it('consolidates the same product+size into one line, incrementing qty', () => {
    addToWhiteBag(sample());
    addToWhiteBag(sample());
    addToWhiteBag(sample());
    const bag = readBag();
    expect(bag).toHaveLength(1);
    expect(bag[0]!.qty).toBe(3);
  });

  it('keeps different sizes and different products as separate lines', () => {
    addToWhiteBag(sample({size: 'M'}));
    addToWhiteBag(sample({size: 'L'}));
    addToWhiteBag(sample({key: 2, size: 'M'}));
    expect(readBag()).toHaveLength(3);
  });

  it('setWhiteBagQty updates the quantity and clamps to a minimum of 1', () => {
    addToWhiteBag(sample());
    const id = readBag()[0]!.id;
    setWhiteBagQty(id, 4);
    expect(readBag()[0]!.qty).toBe(4);
    setWhiteBagQty(id, 0);
    expect(readBag()[0]!.qty).toBe(1);
    setWhiteBagQty(id, -5);
    expect(readBag()[0]!.qty).toBe(1);
  });

  it('removes a line by id, leaving the others', () => {
    addToWhiteBag(sample({size: 'M'}));
    addToWhiteBag(sample({size: 'L'}));
    removeFromWhiteBag('1-M-Black');
    const bag = readBag();
    expect(bag).toHaveLength(1);
    expect(bag[0]!.size).toBe('L');
  });

  it('ignores removal of an unknown id', () => {
    addToWhiteBag(sample());
    removeFromWhiteBag('does-not-exist');
    expect(readBag()).toHaveLength(1);
  });

  it('persists the bag to localStorage under wv-bag', () => {
    addToWhiteBag(sample());
    const raw = localStorage.getItem('wv-bag');
    expect(raw).toContain('"qty":1');
    expect(raw).toContain('"id":"1-M-Black"');
  });
});

describe('useWhiteBag cross-tab sync', () => {
  it('re-reads and broadcasts when another tab writes (storage event)', () => {
    const {result} = renderHook(() => useWhiteBag());
    expect(result.current.count).toBe(0);

    // Simulate another tab writing the bag, then the storage event it fires.
    act(() => {
      localStorage.setItem('wv-bag', JSON.stringify([sample({key: 2, size: 'L'})].map((s) => ({...s, id: '2-L', qty: 2}))));
      window.dispatchEvent(new StorageEvent('storage', {key: 'wv-bag'}));
    });

    expect(result.current.count).toBe(2);
    expect(result.current.items[0]).toMatchObject({key: 2, size: 'L', qty: 2});
  });
});

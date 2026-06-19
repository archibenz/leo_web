import {afterEach, describe, it, expect} from 'vitest';
import {addToWhiteBag, setWhiteBagQty, removeFromWhiteBag, type WhiteBagItem} from './useWhiteBag';

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
  ...over,
});

afterEach(() => {
  readBag().forEach((i) => removeFromWhiteBag(i.id));
  localStorage.clear();
});

describe('useWhiteBag store', () => {
  it('adds an item with qty 1 and a key-size id', () => {
    addToWhiteBag(sample());
    const bag = readBag();
    expect(bag).toHaveLength(1);
    expect(bag[0]).toMatchObject({key: 1, size: 'M', qty: 1, id: '1-M'});
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
    removeFromWhiteBag('1-M');
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
    expect(raw).toContain('"id":"1-M"');
  });
});

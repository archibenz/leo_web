import {renderHook, act, waitFor} from '@testing-library/react';
import {describe, it, expect, vi, beforeEach} from 'vitest';
import {
  useSyncedList,
  defaultParseArray,
  defaultSerializeArray,
  type SyncConfig,
} from '../useSyncedList';
import {getToken} from '../api';

vi.mock('../api', () => ({
  getToken: vi.fn(() => ''),
  apiFetch: vi.fn(),
}));

const mockGetToken = vi.mocked(getToken);
const KEY = 'test_synced_list';

function installLocalStorageMock(): void {
  const store = new Map<string, string>();
  const mock = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
  };
  Object.defineProperty(globalThis, 'localStorage', {value: mock, configurable: true, writable: true});
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {value: mock, configurable: true, writable: true});
  }
}

function makeConfig<T>(overrides: Partial<SyncConfig<T>> = {}): SyncConfig<T> {
  return {
    localStorageKey: KEY,
    fetchServer: vi.fn(async () => [] as T[]),
    mergeGuest: vi.fn(async () => {}),
    parseLocal: defaultParseArray,
    serializeLocal: defaultSerializeArray,
    isAuthenticated: false,
    authLoading: false,
    ...overrides,
  };
}

beforeEach(() => {
  installLocalStorageMock();
  mockGetToken.mockReset();
  mockGetToken.mockReturnValue('');
});

describe('default array helpers', () => {
  it('parses a JSON array', () => {
    expect(defaultParseArray<string>('["a","b"]')).toEqual(['a', 'b']);
  });

  it('returns [] for non-array JSON', () => {
    expect(defaultParseArray('{"x":1}')).toEqual([]);
    expect(defaultParseArray('42')).toEqual([]);
  });

  it('round-trips through serialize/parse', () => {
    const items = ['a', 'b', 'c'];
    expect(defaultParseArray(defaultSerializeArray(items))).toEqual(items);
  });
});

describe('useSyncedList', () => {
  it('guest mode loads from localStorage and never hits the server', async () => {
    localStorage.setItem(KEY, JSON.stringify(['g1', 'g2']));
    const fetchServer = vi.fn(async () => ['s1']);
    const {result} = renderHook(() =>
      useSyncedList<string>(makeConfig({isAuthenticated: false, fetchServer})),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toEqual(['g1', 'g2']);
    expect(fetchServer).not.toHaveBeenCalled();
  });

  it('merges guest items into the server on auth transition, then clears local', async () => {
    localStorage.setItem(KEY, JSON.stringify(['g1', 'g2']));
    mockGetToken.mockReturnValue('tok');
    const fetchServer = vi.fn(async () => ['s1', 's2']);
    const mergeGuest = vi.fn(async () => {});
    const {result, rerender} = renderHook(
      ({auth}: {auth: boolean}) =>
        useSyncedList<string>(makeConfig({isAuthenticated: auth, fetchServer, mergeGuest})),
      {initialProps: {auth: false}},
    );

    await waitFor(() => expect(result.current.items).toEqual(['g1', 'g2']));

    rerender({auth: true});

    await waitFor(() => expect(result.current.items).toEqual(['s1', 's2']));
    expect(mergeGuest).toHaveBeenCalledWith(['g1', 'g2']);
    expect(fetchServer).toHaveBeenCalled();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('authenticated with no guest items skips merge and loads from server', async () => {
    mockGetToken.mockReturnValue('tok');
    const fetchServer = vi.fn(async () => ['s1']);
    const mergeGuest = vi.fn(async () => {});
    const {result} = renderHook(() =>
      useSyncedList<string>(makeConfig({isAuthenticated: true, fetchServer, mergeGuest})),
    );
    await waitFor(() => expect(result.current.items).toEqual(['s1']));
    expect(mergeGuest).not.toHaveBeenCalled();
    expect(fetchServer).toHaveBeenCalledTimes(1);
  });

  it('does not load while authLoading is true', async () => {
    mockGetToken.mockReturnValue('tok');
    const fetchServer = vi.fn(async () => ['s1']);
    const {result} = renderHook(() =>
      useSyncedList<string>(makeConfig({isAuthenticated: true, authLoading: true, fetchServer})),
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.isLoading).toBe(true);
    expect(fetchServer).not.toHaveBeenCalled();
  });

  it('calls onServerLoadError when the server load fails', async () => {
    mockGetToken.mockReturnValue('tok');
    const fetchServer = vi.fn(async () => {
      throw new Error('boom');
    });
    const onServerLoadError = vi.fn();
    renderHook(() =>
      useSyncedList<string>(makeConfig({isAuthenticated: true, fetchServer, onServerLoadError})),
    );
    await waitFor(() => expect(onServerLoadError).toHaveBeenCalledTimes(1));
  });

  it('persists items to localStorage in guest mode via setItems', async () => {
    const {result} = renderHook(() =>
      useSyncedList<string>(makeConfig({isAuthenticated: false})),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setItems(['x', 'y']);
    });

    expect(result.current.items).toEqual(['x', 'y']);
    await waitFor(() =>
      expect(localStorage.getItem(KEY)).toBe(JSON.stringify(['x', 'y'])),
    );
  });
});

import {beforeEach, afterEach, describe, it, expect, vi} from 'vitest';
import {subscribeToasts, showToast, dismissToast, type Toast} from '../toast';

// Read the current toasts via the immediate-snapshot contract of subscribeToasts.
function currentToasts(): readonly Toast[] {
  let snap: readonly Toast[] = [];
  const unsub = subscribeToasts((t) => {
    snap = t;
  });
  unsub();
  return snap;
}

beforeEach(() => {
  // Fake timers keep auto-dismiss deterministic and avoid real timers leaking
  // between tests (showToast schedules window.setTimeout for the default 5s).
  vi.useFakeTimers();
});

afterEach(() => {
  // Drain the module-level store so state never leaks across tests.
  currentToasts().forEach((t) => dismissToast(t.id));
  vi.useRealTimers();
});

describe('subscribeToasts', () => {
  it('invokes the listener immediately with the current snapshot', () => {
    const seen: Toast[][] = [];
    const unsub = subscribeToasts((t) => seen.push([...t]));
    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual([]);
    unsub();
  });

  it('notifies on change and stops after unsubscribe', () => {
    const calls: number[] = [];
    const unsub = subscribeToasts((t) => calls.push(t.length));
    showToast({message: 'a'});
    unsub();
    showToast({message: 'b'});
    expect(calls).toEqual([0, 1]); // initial snapshot + first show; second show not seen
  });
});

describe('showToast', () => {
  it('adds a toast with defaults and returns its id', () => {
    const id = showToast({message: 'hello'});
    expect(id).toBeTruthy();
    const [toast] = currentToasts();
    expect(toast).toMatchObject({id, kind: 'info', message: 'hello', duration: 5000});
  });

  it('respects explicit kind, duration and messageKey', () => {
    showToast({kind: 'error', messageKey: 'errors.generic', duration: 2000});
    const [toast] = currentToasts();
    expect(toast).toMatchObject({kind: 'error', messageKey: 'errors.generic', duration: 2000});
  });

  it('generates distinct ids for concurrent toasts', () => {
    const id1 = showToast({message: '1'});
    const id2 = showToast({message: '2'});
    expect(id1).not.toBe(id2);
    expect(currentToasts()).toHaveLength(2);
  });

  it('auto-dismisses after its duration elapses', () => {
    const id = showToast({message: 'bye', duration: 1000});
    expect(currentToasts().some((t) => t.id === id)).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(currentToasts().some((t) => t.id === id)).toBe(false);
  });

  it('does not auto-dismiss when duration is 0', () => {
    const id = showToast({message: 'sticky', duration: 0});
    vi.advanceTimersByTime(100_000);
    expect(currentToasts().some((t) => t.id === id)).toBe(true);
  });
});

describe('dismissToast', () => {
  it('removes the matching toast and notifies', () => {
    const calls: number[] = [];
    const unsub = subscribeToasts((t) => calls.push(t.length));
    const id = showToast({message: 'x'});
    dismissToast(id);
    unsub();
    expect(calls).toEqual([0, 1, 0]);
    expect(currentToasts()).toHaveLength(0);
  });

  it('is a no-op for an unknown id (no extra notification)', () => {
    showToast({message: 'keep'});
    const calls: number[] = [];
    const unsub = subscribeToasts((t) => calls.push(t.length));
    dismissToast('does-not-exist');
    unsub();
    expect(calls).toEqual([1]); // only the immediate snapshot; the no-op dismiss never notifies
  });
});

describe('immutability', () => {
  it('passes a fresh array snapshot to listeners, never the internal array', () => {
    const snapshots: (readonly Toast[])[] = [];
    const unsub = subscribeToasts((t) => snapshots.push(t));
    showToast({message: 'a'});
    unsub();
    expect(snapshots[0]).not.toBe(snapshots[1]);
  });
});

import {describe, it, expect, afterEach, vi} from 'vitest';

// track() reads NEXT_PUBLIC_YM_ID at module load, so each scenario needs a fresh
// module instance: set env + window.ym, resetModules, dynamic import (same shape
// as siteUrl.test). track() is the pervasive funnel wrapper — it must call ym
// correctly when enabled, no-op when not, and NEVER throw (it guards the UI).
const ENV_KEY = 'NEXT_PUBLIC_YM_ID';
const original = process.env[ENV_KEY];

afterEach(() => {
  if (original === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = original;
  delete (window as {ym?: unknown}).ym;
  vi.resetModules();
});

async function loadTrack(ymId: string | undefined) {
  if (ymId === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = ymId;
  vi.resetModules();
  const mod = await import('../analytics');
  return mod.track;
}

describe('analytics.track', () => {
  it('calls window.ym(id, reachGoal, goal, params) when YM_ID is set and ym exists', async () => {
    const ym = vi.fn();
    (window as {ym?: unknown}).ym = ym;
    const track = await loadTrack('12345');

    track('begin_checkout', {value: 100});

    expect(ym).toHaveBeenCalledTimes(1);
    expect(ym).toHaveBeenCalledWith(12345, 'reachGoal', 'begin_checkout', {value: 100});
  });

  it('passes undefined params straight through', async () => {
    const ym = vi.fn();
    (window as {ym?: unknown}).ym = ym;
    const track = await loadTrack('777');

    track('view_item');

    expect(ym).toHaveBeenCalledWith(777, 'reachGoal', 'view_item', undefined);
  });

  it('is a no-op when YM_ID is unset (0)', async () => {
    const ym = vi.fn();
    (window as {ym?: unknown}).ym = ym;
    const track = await loadTrack(undefined);

    track('begin_checkout');

    expect(ym).not.toHaveBeenCalled();
  });

  it('is a no-op (and does not throw) when window.ym is absent', async () => {
    delete (window as {ym?: unknown}).ym;
    const track = await loadTrack('12345');

    expect(() => track('add_to_cart')).not.toThrow();
  });

  it('never throws even if window.ym throws (analytics must not break the UI)', async () => {
    (window as {ym?: unknown}).ym = vi.fn(() => {
      throw new Error('ym blew up');
    });
    const track = await loadTrack('12345');

    expect(() => track('begin_checkout', {value: 1})).not.toThrow();
  });
});

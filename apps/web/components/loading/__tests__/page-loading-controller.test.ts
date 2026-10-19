import { describe, expect, it, vi } from 'vitest';
import { PageLoadingController } from '../page-loading-controller';

async function flush() { await Promise.resolve(); }

describe('page loading lifecycle', () => {
  it('does not finish at URL change; waits for destination content and its blockers', async () => {
    const loading = new PageLoadingController();
    const id = loading.begin('/ru', '/ru/account');
    const release = loading.block('/ru/account');
    loading.commit(id, '/ru/account');
    await flush();
    expect(loading.getSnapshot().phase).toBe('loading');
    release();
    await flush();
    expect(loading.getSnapshot().phase).toBe('complete');
  });

  it('ignores old page commits and late completion from a superseded navigation', async () => {
    const loading = new PageLoadingController();
    const first = loading.begin('/ru', '/ru/account');
    const second = loading.begin('/ru', '/ru/collections');
    loading.commit(first, '/ru/account');
    loading.transitionSettled(first);
    loading.commit(second, '/ru');
    await flush();
    expect(loading.getSnapshot().phase).toBe('loading');
    loading.commit(second, '/ru/collections');
    await flush();
    expect(loading.getSnapshot().phase).toBe('complete');
  });

  it('tracks query changes and ignores blockers belonging to the old route', async () => {
    const loading = new PageLoadingController();
    const release = loading.block('/ru/shop?page=1');
    const id = loading.begin('/ru/shop?page=1', '/ru/shop?page=2');
    loading.commit(id, '/ru/shop?page=1');
    await flush();
    expect(loading.getSnapshot().phase).toBe('loading');
    loading.commit(id, '/ru/shop?page=2');
    await flush();
    expect(loading.getSnapshot().phase).toBe('complete');
    release();
  });

  it('accepts a redirected destination only after its transition settles', async () => {
    const loading = new PageLoadingController();
    const id = loading.begin('/ru', '/ru/account');
    loading.commit(id, '/ru/login');
    await flush();
    expect(loading.getSnapshot().phase).toBe('loading');
    loading.transitionSettled(id);
    await flush();
    expect(loading.getSnapshot().phase).toBe('complete');
  });

  it('does not accept the source page as destination after transition settlement', async () => {
    const loading = new PageLoadingController();
    const id = loading.begin('/ru', '/ru/account');
    loading.transitionSettled(id);
    loading.commit(id, '/ru');
    await flush();
    expect(loading.getSnapshot().phase).toBe('loading');
  });

  it('a filter blocker starts progress and only its final release completes it', async () => {
    const loading = new PageLoadingController();
    const first = loading.block('/ru/shop');
    const second = loading.block('/ru/shop');
    first();
    await flush();
    expect(loading.getSnapshot().phase).toBe('loading');
    second();
    await flush();
    expect(loading.getSnapshot().phase).toBe('complete');
  });

  it('supersedes an implicit query operation before its previous cleanup microtask completes', async () => {
    const loading = new PageLoadingController();
    const first = loading.block('/ru/shop?q=a');
    const oldId = loading.getSnapshot().id;
    first();
    const second = loading.block('/ru/shop?q=ab');
    await flush();
    expect(loading.getSnapshot().id).toBeGreaterThan(oldId);
    expect(loading.getSnapshot().phase).toBe('loading');
    second();
    await flush();
    expect(loading.getSnapshot().phase).toBe('complete');
  });

  it('late cleanup from an earlier implicit query cannot complete the newer query', async () => {
    const loading = new PageLoadingController();
    const first = loading.block('/ru/shop?q=a');
    const second = loading.block('/ru/shop?q=ab');
    first();
    await flush();
    expect(loading.getSnapshot().phase).toBe('loading');
    second();
    await flush();
    expect(loading.getSnapshot().phase).toBe('complete');
  });

  it('a settled refresh still needs a new content commit', async () => {
    const loading = new PageLoadingController();
    const id = loading.begin('/ru/account', '/ru/account');
    loading.transitionSettled(id);
    await flush();
    expect(loading.getSnapshot().phase).toBe('loading');
    loading.commit(id, '/ru/account');
    await flush();
    expect(loading.getSnapshot().phase).toBe('complete');
  });

  it('client destination content can finish its own query data lease', async () => {
    const loading = new PageLoadingController();
    loading.begin('/ru/shop?page=1', '/ru/shop?page=2');
    const release = loading.block('/ru/shop?page=2');
    await flush();
    expect(loading.getSnapshot().phase).toBe('loading');
    release();
    await flush();
    expect(loading.getSnapshot().phase).toBe('complete');
  });

  it('aborts errors without successful completion and cannot abort a newer request', async () => {
    const loading = new PageLoadingController();
    const old = loading.begin('/ru', '/ru/account');
    const current = loading.begin('/ru', '/ru/shop');
    loading.abort(old);
    expect(loading.getSnapshot().phase).toBe('loading');
    loading.abort(current);
    expect(loading.getSnapshot().phase).toBe('aborted');
    loading.commit(current, '/ru/shop');
    await flush();
    expect(loading.getSnapshot().phase).toBe('aborted');
  });

  it('notifies subscribers and resets only the completed operation', async () => {
    const loading = new PageLoadingController();
    const listener = vi.fn();
    const unsubscribe = loading.subscribe(listener);
    const first = loading.begin('/ru', '/ru/account');
    loading.commit(first, '/ru/account');
    await flush();
    const second = loading.begin('/ru/account', '/ru/shop');
    loading.reset(first);
    expect(loading.getSnapshot().id).toBe(second);
    expect(loading.getSnapshot().phase).toBe('loading');
    unsubscribe();
    const calls = listener.mock.calls.length;
    loading.abort(second);
    expect(listener).toHaveBeenCalledTimes(calls);
  });
});

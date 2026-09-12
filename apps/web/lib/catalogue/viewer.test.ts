import {describe, it, expect, beforeEach, vi} from 'vitest';

const cookieStore = {value: null as string | null};
vi.mock('next/headers', () => ({
  cookies: async () => ({get: (name: string) => (name === 'rl_session' && cookieStore.value ? {name, value: cookieStore.value} : undefined)}),
}));

const getStorefront = vi.fn();
const getStorefrontPreview = vi.fn();
vi.mock('./fetch', () => ({
  getStorefront: (...args: unknown[]) => getStorefront(...args),
  getStorefrontPreview: (...args: unknown[]) => getStorefrontPreview(...args),
}));

const PUBLISHED = {products: [], sets: [], sections: [{slug: 'aw26-hero', headlineRu: 'опубликовано'}]};
const DRAFT = {products: [], sets: [], sections: [{slug: 'aw26-hero', headlineRu: 'черновик'}]};

beforeEach(() => {
  cookieStore.value = null;
  getStorefront.mockReset().mockResolvedValue(PUBLISHED);
  getStorefrontPreview.mockReset();
});

describe('wantsEditing', () => {
  it('opens only on the exact flag, so a stray ?edit=true is not a back door', async () => {
    const {wantsEditing} = await import('./viewer');
    expect(wantsEditing({edit: '1'})).toBe(true);
    expect(wantsEditing({edit: ['1']})).toBe(true);
    expect(wantsEditing({edit: 'true'})).toBe(false);
    expect(wantsEditing({edit: '0'})).toBe(false);
    expect(wantsEditing(undefined)).toBe(false);
  });
});

describe('storefrontForViewer', () => {
  it('serves the published storefront and never touches the preview without the flag', async () => {
    const {storefrontForViewer} = await import('./viewer');
    cookieStore.value = 'admin-session';

    const view = await storefrontForViewer(false);

    expect(view).toEqual({editing: false, storefront: PUBLISHED});
    expect(getStorefrontPreview).not.toHaveBeenCalled();
    expect(JSON.stringify(view)).not.toContain('черновик');
  });

  it('does not even ask the API when the visitor carries no session', async () => {
    const {storefrontForViewer} = await import('./viewer');

    const view = await storefrontForViewer(true);

    expect(view).toEqual({editing: false, storefront: PUBLISHED});
    expect(getStorefrontPreview).not.toHaveBeenCalled();
  });

  it('gives a signed-in stranger the published storefront, draft values included nowhere', async () => {
    const {storefrontForViewer} = await import('./viewer');
    cookieStore.value = 'shopper-session';
    getStorefrontPreview.mockResolvedValue({state: 'forbidden'});

    const view = await storefrontForViewer(true);

    expect(view).toEqual({editing: false, storefront: PUBLISHED});
    expect(JSON.stringify(view)).not.toContain('черновик');
  });

  it('hands the editor the draft, with the session forwarded to the API', async () => {
    const {storefrontForViewer} = await import('./viewer');
    cookieStore.value = 'admin-session';
    getStorefrontPreview.mockResolvedValue({state: 'draft', storefront: DRAFT});

    const view = await storefrontForViewer(true);

    expect(view).toEqual({editing: true, storefront: DRAFT});
    expect(getStorefrontPreview).toHaveBeenCalledWith('rl_session=admin-session');
    expect(getStorefront).not.toHaveBeenCalled();
  });

  it('fails honestly instead of showing the published page as if it were the draft', async () => {
    const {storefrontForViewer} = await import('./viewer');
    cookieStore.value = 'admin-session';
    getStorefrontPreview.mockResolvedValue({state: 'unavailable', reason: 'fetch failed'});

    const view = await storefrontForViewer(true);

    expect(view).toEqual({editing: true, storefront: null, previewError: 'fetch failed'});
    expect(getStorefront).not.toHaveBeenCalled();
  });
});

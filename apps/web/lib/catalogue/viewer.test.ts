import {describe, it, expect, beforeEach, vi} from 'vitest';

const cookieStore = {session: null as string | null, edit: null as string | null};
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      if (name === 'rl_session' && cookieStore.session) return {name, value: cookieStore.session};
      if (name === 'rl_edit' && cookieStore.edit) return {name, value: cookieStore.edit};
      return undefined;
    },
  }),
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
  cookieStore.session = null;
  cookieStore.edit = null;
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
    cookieStore.session = 'admin-session';

    const view = await storefrontForViewer(false);

    expect(view).toEqual({editing: false, wantsEdit: false, storefront: PUBLISHED});
    expect(getStorefrontPreview).not.toHaveBeenCalled();
    expect(JSON.stringify(view)).not.toContain('черновик');
  });

  it('does not even ask the API when the visitor carries no session', async () => {
    const {storefrontForViewer} = await import('./viewer');

    const view = await storefrontForViewer(true);

    expect(view).toEqual({editing: false, wantsEdit: true, storefront: PUBLISHED});
    expect(getStorefrontPreview).not.toHaveBeenCalled();
  });

  it('gives a signed-in stranger the published storefront, draft values included nowhere', async () => {
    const {storefrontForViewer} = await import('./viewer');
    cookieStore.session = 'shopper-session';
    getStorefrontPreview.mockResolvedValue({state: 'forbidden'});

    const view = await storefrontForViewer(true);

    expect(view).toEqual({editing: false, wantsEdit: true, storefront: PUBLISHED});
    expect(JSON.stringify(view)).not.toContain('черновик');
  });

  it('hands the editor the draft, with the session forwarded to the API', async () => {
    const {storefrontForViewer} = await import('./viewer');
    cookieStore.session = 'admin-session';
    getStorefrontPreview.mockResolvedValue({state: 'draft', storefront: DRAFT});

    const view = await storefrontForViewer(true);

    expect(view).toEqual({editing: true, wantsEdit: true, storefront: DRAFT});
    expect(getStorefrontPreview).toHaveBeenCalledWith('rl_session=admin-session');
    expect(getStorefront).not.toHaveBeenCalled();
  });

  it('fails honestly instead of showing the published page as if it were the draft', async () => {
    const {storefrontForViewer} = await import('./viewer');
    cookieStore.session = 'admin-session';
    getStorefrontPreview.mockResolvedValue({state: 'unavailable', reason: 'fetch failed'});

    const view = await storefrontForViewer(true);

    expect(view).toEqual({editing: true, wantsEdit: true, storefront: null, previewError: 'fetch failed'});
    expect(getStorefront).not.toHaveBeenCalled();
  });
});

// Вторая, персистентная дорога к тому же намерению: кука rl_edit, которую
// ставит выключатель в аккаунте. Она ни разу не выдаёт черновик сама —
// каждый сценарий здесь либо кончается тем же вызовом getStorefrontPreview,
// что и у параметра, либо явно не доходит до API вовсе.
describe('storefrontForViewer — кука rl_edit как второе намерение', () => {
  it('кука без параметра тоже открывает предпросмотр — если сессия при ней есть', async () => {
    const {storefrontForViewer} = await import('./viewer');
    cookieStore.edit = '1';
    cookieStore.session = 'admin-session';
    getStorefrontPreview.mockResolvedValue({state: 'draft', storefront: DRAFT});

    const view = await storefrontForViewer(false);

    expect(view).toEqual({editing: true, wantsEdit: true, storefront: DRAFT});
    expect(getStorefrontPreview).toHaveBeenCalledWith('rl_session=admin-session');
  });

  // Главный кейс безопасности этапа: кука — это «хочу видеть черновик», не
  // «мне можно». Без rl_session бэкенд физически не спрошен.
  //
  // wantsEdit=true в ответе — не для этой ветки, а для следующей: EditorNotice
  // честно скажет «сервер не признал сессию» только если знает, что черновик
  // вообще ХОТЕЛИ увидеть. Сервер это уже знает здесь — значит должен отдать,
  // а не заставлять клиента заново гадать по document.cookie (гидратация).
  it('кука есть, а сессии нет — публичная витрина, но wantsEdit всё равно true для честного баннера', async () => {
    const {storefrontForViewer} = await import('./viewer');
    cookieStore.edit = '1';

    const view = await storefrontForViewer(false);

    expect(view).toEqual({editing: false, wantsEdit: true, storefront: PUBLISHED});
    expect(getStorefrontPreview).not.toHaveBeenCalled();
    expect(JSON.stringify(view)).not.toContain('черновик');
  });
});

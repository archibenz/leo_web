import {cleanup, render, screen} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {PageLoadingFallback, PageSkeleton, getPageSkeletonKind, type PageSkeletonKind} from '../PageSkeleton';

const {registerLoading} = vi.hoisted(() => ({registerLoading: vi.fn()}));
vi.mock('../PageLoadingProvider', () => ({usePageLoading: registerLoading}));

function show(kind: PageSkeletonKind, embedded = false) {
  return render(
    <NextIntlClientProvider locale="ru" messages={{common: {loading: 'Загрузка…'}}}>
      <PageSkeleton kind={kind} embedded={embedded} />
    </NextIntlClientProvider>,
  );
}

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('destination-shaped loading content', () => {
  it.each([
    ['/ru', 'home'], ['/en/', 'home'], ['/ru/shop?q=dress', 'catalog'],
    ['/en/product/linen-dress', 'product'], ['/ru/account', 'account'],
    ['/ru/auth/tg', 'account'], ['/ru/bag', 'bag'], ['/en/favourites', 'favorites'],
    ['/ru/lookbook', 'editorial'], ['/ru/sets', 'editorial'], ['/ru/privacy', 'info'],
    ['/en/delivery', 'info'], ['/ru/admin', 'admin-dashboard'],
    ['/en/admin/products', 'admin-table'], ['/ru/admin/inventory', 'admin-table'],
    ['/ru/admin/products/42', 'admin-form'], ['/en/admin/products/new', 'admin-form'],
    ['/ru/admin/homepage', 'admin-form'],
  ] as const)('selects the destination content for %s', (path, expected) => {
    expect(getPageSkeletonKind(path)).toBe(expected);
  });

  it.each(['home', 'catalog', 'product', 'account', 'bag', 'favorites', 'editorial', 'info', 'admin-dashboard', 'admin-table', 'admin-form'] as const)(
    '%s announces loading once without adding interactive controls or repeating chrome', (kind) => {
      const {container} = show(kind);
      expect(screen.getByRole('status')).toHaveAccessibleName('Загрузка…');
      expect(screen.getAllByRole('status')).toHaveLength(1);
      expect(container.querySelector('a, button, input, select, textarea, header, footer, nav')).toBeNull();
      expect(container.querySelector('[data-skeleton-content]')).toHaveAttribute('aria-hidden', 'true');
      expect(registerLoading).not.toHaveBeenCalled();
    },
  );

  it('keeps the shop footer hidden only for full-page fallback content', () => {
    const whole = show('account');
    expect(whole.container.querySelector('[data-shop-loading]')).not.toBeNull();
    whole.unmount();
    const embedded = show('account', true);
    expect(embedded.container.querySelector('[data-shop-loading]')).toBeNull();
    expect(embedded.container.querySelector('.page-skeleton__account-art')).toBeNull();
    expect(embedded.container.querySelectorAll('.page-skeleton__field')).toHaveLength(2);
  });

  it('reserves garment images and metadata instead of text-only placeholders', () => {
    const catalog = show('catalog');
    expect(catalog.container.querySelectorAll('.page-skeleton__product-card')).toHaveLength(6);
    expect(catalog.container.querySelectorAll('.page-skeleton__product-card .page-skeleton__portrait')).toHaveLength(6);
    catalog.unmount();
    const product = show('product');
    expect(product.container.querySelector('.page-skeleton__gallery')).not.toBeNull();
    expect(product.container.querySelector('.page-skeleton__product-details')).not.toBeNull();
  });

  it('uses pending registration only at a route fallback boundary', () => {
    render(
      <NextIntlClientProvider locale="en" messages={{common: {loading: 'Loading…'}}}>
        <PageLoadingFallback kind="bag" />
      </NextIntlClientProvider>,
    );
    expect(registerLoading).toHaveBeenCalledWith(true);
    expect(screen.getByRole('status')).toHaveAccessibleName('Loading…');
  });
});

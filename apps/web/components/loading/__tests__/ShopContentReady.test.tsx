import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../messages/en.json';
import type { WhiteProduct } from '../../../lib/catalogue/types';
import WhiteShopShowcase from '../../../app/[locale]/(shop)/shop/WhiteShopShowcase';
import { PageLoadingProvider, useLoadingNavigation } from '../PageLoadingProvider';

vi.mock('../../../app/[locale]/WhiteProductCard', () => ({ default: ({ product }: { product: WhiteProduct }) => <p>{product.en}</p> }));

const products: WhiteProduct[] = [
  { id: 'a', key: 1, slug: 'dress', en: 'Dress fixture', ru: 'Платье', cat: 'dresses', price: 3000, nm: 1,
    descEn: '', descRu: '', compositionEn: '', compositionRu: '', careEn: '', careRu: '', colors: [{ id: 'a-black', key: 'black', hex: '#000', en: 'Black', ru: 'Чёрный' }], image: '/dress.jpg' },
  { id: 'b', key: 2, slug: 'skirt', en: 'Skirt fixture', ru: 'Юбка', cat: 'skirts', price: 1000, nm: 2,
    descEn: '', descRu: '', compositionEn: '', compositionRu: '', careEn: '', careRu: '', colors: [{ id: 'b-black', key: 'black', hex: '#000', en: 'Black', ru: 'Чёрный' }], image: '/skirt.jpg' },
];
const bar = () => document.querySelector('[data-page-loading]');
async function flush() { await act(async () => { await Promise.resolve(); }); }
function Controls() {
  const navigate = useLoadingNavigation();
  return <><button onClick={() => navigate?.(() => {}, '/en/shop?cat=dresses')}>Server query</button><button onClick={() => navigate?.(() => {}, '/en/shop')}>Refresh data</button></>;
}
function View({ cat = 'all' as 'all' | 'dresses', items = products }) {
  return <PageLoadingProvider><Controls /><NextIntlClientProvider locale="en" messages={{ common: en.common, white: { shop: en.white.shop } }}><WhiteShopShowcase locale="en" products={items} initialCat={cat} /></NextIntlClientProvider></PageLoadingProvider>;
}
beforeEach(() => window.history.replaceState({}, '', '/en/shop'));
afterEach(cleanup);

it('waits for query props then completes after the destination product grid commits', async () => {
  const view = render(<View />);
  fireEvent.click(screen.getByText('Server query'));
  window.history.replaceState({}, '', '/en/shop?cat=dresses');
  await flush();
  expect(bar()).toHaveAttribute('data-state', 'loading');
  expect(screen.getByText('Skirt fixture')).toBeVisible();
  view.rerender(<View cat="dresses" />);
  await flush();
  expect(screen.queryByText('Skirt fixture')).toBeNull();
  expect(screen.getByText('Dress fixture')).toBeVisible();
  expect(bar()).toHaveAttribute('data-state', 'complete');
});

it('completes a same-URL refresh after new catalogue props commit', async () => {
  const view = render(<View />);
  fireEvent.click(screen.getByText('Refresh data'));
  await flush();
  expect(bar()).toHaveAttribute('data-state', 'loading');
  view.rerender(<View items={[products[0]]} />);
  await flush();
  expect(screen.queryByText('Skirt fixture')).toBeNull();
  expect(bar()).toHaveAttribute('data-state', 'complete');
});

it('completes a browser back query after the restored grid commits', async () => {
  window.history.replaceState({}, '', '/en/shop?cat=dresses');
  const view = render(<View cat="dresses" />);
  window.history.replaceState({}, '', '/en/shop');
  act(() => window.dispatchEvent(new PopStateEvent('popstate')));
  expect(bar()).toHaveAttribute('data-state', 'loading');
  view.rerender(<View />);
  await flush();
  expect(screen.getByText('Skirt fixture')).toBeVisible();
  expect(bar()).toHaveAttribute('data-state', 'complete');
});

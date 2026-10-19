import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import type {ReactNode} from 'react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {NextIntlClientProvider} from 'next-intl';
import en from '../../../../messages/en.json';
import type {WhiteProduct} from '../../../../lib/catalogue/types';
import WhiteShopShowcase from './WhiteShopShowcase';

const loading = vi.hoisted(() => vi.fn());
vi.mock('../../../../components/loading/PageLoadingProvider', () => ({
  usePageLoading: loading,
  PageContentReady: ({children}: {children: ReactNode}) => children,
}));
vi.mock('../../WhiteProductCard', () => ({default: ({product}: {product: WhiteProduct}) => <p>{product.en}</p>}));
beforeEach(() => {
  loading.mockClear();
  window.history.replaceState(null, '', '/en/shop');
});
afterEach(cleanup);

const products: WhiteProduct[] = [
  {id: 'a', key: 1, slug: 'dress', en: 'Dress fixture', ru: 'Платье', cat: 'dresses', price: 3000, nm: 1,
    descEn: '', descRu: '', compositionEn: '', compositionRu: '', careEn: '', careRu: '', colors: [{id: 'a-black', key: 'black', hex: '#000', en: 'Black', ru: 'Чёрный'}], image: '/dress.jpg'},
  {id: 'b', key: 2, slug: 'skirt', en: 'Skirt fixture', ru: 'Юбка', cat: 'skirts', price: 1000, nm: 2,
    descEn: '', descRu: '', compositionEn: '', compositionRu: '', careEn: '', careRu: '', colors: [{id: 'b-black', key: 'black', hex: '#000', en: 'Black', ru: 'Чёрный'}], image: '/skirt.jpg'},
];

it('finishes search and sorting feedback with the resulting client grid, without a timer', () => {
  render(<NextIntlClientProvider locale="en" messages={{common: en.common, white: {shop: en.white.shop}}}><WhiteShopShowcase locale="en" products={products}/></NextIntlClientProvider>);
  loading.mockClear();
  fireEvent.change(screen.getByRole('searchbox'), {target: {value: 'dress'}});
  expect(loading).toHaveBeenCalledWith(true);
  expect(loading).toHaveBeenLastCalledWith(false);
  expect(screen.getByText('Dress fixture')).toBeVisible();
  expect(screen.queryByText('Skirt fixture')).toBeNull();
  expect(new URL(window.location.href).searchParams.get('q')).toBe('dress');

  fireEvent.change(screen.getByRole('searchbox'), {target: {value: ''}});
  loading.mockClear();
  fireEvent.change(screen.getByRole('combobox'), {target: {value: 'asc'}});
  expect(loading).toHaveBeenCalledWith(true);
  expect(loading).toHaveBeenLastCalledWith(false);
  expect(screen.getAllByText(/fixture/).map(node => node.textContent)).toEqual(['Skirt fixture', 'Dress fixture']);
  expect(new URL(window.location.href).searchParams.get('sort')).toBe('asc');
});

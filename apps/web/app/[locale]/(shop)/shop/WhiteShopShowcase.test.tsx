import {afterEach, expect, it, vi} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import en from '../../../../messages/en.json';
import WhiteShopShowcase from './WhiteShopShowcase';

vi.mock('../../WhiteProductCard', () => ({default: () => null}));
afterEach(cleanup);

it('honours a new deep-link focus intent when the search was already open', () => {
  const page = (focusSearch: boolean) => (
    <NextIntlClientProvider locale="en" messages={{white: {shop: en.white.shop}}}>
      <WhiteShopShowcase locale="en" products={[]} initialQuery="dress" focusSearch={focusSearch} />
    </NextIntlClientProvider>
  );
  const {rerender} = render(page(false));
  screen.getByRole('combobox').focus();
  expect(screen.getByRole('searchbox')).not.toHaveFocus();
  rerender(page(true));
  expect(screen.getByRole('searchbox')).toHaveFocus();
});

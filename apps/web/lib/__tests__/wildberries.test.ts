import {describe, it, expect} from 'vitest';
import {WILDBERRIES_SELLER_URL} from '../wildberries';

// WILDBERRIES_SELLER_URL is the real purchase destination (cart "Оформить" +
// PDP route there — no native checkout). A malformed edit would silently break
// the funnel, so guard its structure rather than only pinning the literal.
describe('WILDBERRIES_SELLER_URL', () => {
  it('is a well-formed absolute https URL', () => {
    expect(typeof WILDBERRIES_SELLER_URL).toBe('string');
    const url = new URL(WILDBERRIES_SELLER_URL);
    expect(url.protocol).toBe('https:');
  });

  it('points at the Wildberries seller storefront', () => {
    const url = new URL(WILDBERRIES_SELLER_URL);
    expect(url.host).toBe('www.wildberries.ru');
    // /seller/<numeric id> — the format the cart/PDP open in a new tab.
    expect(url.pathname).toMatch(/^\/seller\/\d+$/);
  });
});

import {describe, it, expect} from 'vitest';
import {whiteAvailability} from './products';

// Three states, and the storefront reads them in this order. The tests pin the
// order rather than the current answers: today nothing is in stock on the site,
// so 'site' is unreachable, but the day stock is wired up it must win over a
// marketplace listing rather than sit behind it.

describe('whiteAvailability', () => {
  it('sends a piece with a Wildberries article to the marketplace', () => {
    expect(whiteAvailability({key: 3, nm: 962827637})).toBe('marketplace');
  });

  it('sends a piece with an Ozon card to the marketplace even without a WB article', () => {
    expect(whiteAvailability({key: 999, nm: 0}, {onOzon: true})).toBe('marketplace');
  });

  it('reports nowhere when the piece has neither', () => {
    // This is what puts the pre-order form on the page instead of a dead button.
    expect(whiteAvailability({key: 999, nm: 0})).toBe('none');
  });

  it('treats a missing article as nowhere rather than linking to a broken WB page', () => {
    expect(whiteAvailability({key: 999, nm: undefined as unknown as number})).toBe('none');
  });
});

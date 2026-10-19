import {useLayoutEffect} from 'react';
import {act, cleanup, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import WhiteAccountShowcase from '../../app/[locale]/(shop)/account/WhiteAccountShowcase';
import EditCareGuidePage from '../../app/[locale]/(admin)/admin/care/[id]/page';
import {useWhiteBag} from '../../hooks/useWhiteBag';
import {useWhiteFavourites} from '../../hooks/useWhiteFavourites';

const fixture = vi.hoisted(() => ({
  ready: false,
  authError: false,
  loading: vi.fn(),
  apiFetch: vi.fn(),
}));
vi.mock('../loading/PageLoadingProvider', () => ({usePageLoading: fixture.loading}));
vi.mock('../../hooks/useWhiteAuth', () => ({
  useWhiteAuth: () => ({ready: fixture.ready, authError: fixture.authError, isLoggingOut: false, user: null}),
  WHITE_PASSWORD_RE: /.+/,
}));
vi.mock('../../lib/api', () => ({apiFetch: fixture.apiFetch}));
vi.mock('next/navigation', () => ({useParams: () => ({id: 'guide-a'})}));
vi.mock('next-intl', () => ({useTranslations: () => (key: string) => key}));
vi.mock('../editor/OwnerTools', () => ({default: () => null}));
vi.mock('../account/WhiteTelegramLink', () => ({default: () => null}));
vi.mock('../../app/[locale]/WhiteTelegramLogin', () => ({default: () => null}));
vi.mock('../../app/[locale]/WhiteFloatingPaths', () => ({default: () => null}));
vi.mock('../admin/CareGuideForm', () => ({default: () => <p>Care editor ready</p>}));

beforeEach(() => {
  fixture.ready = false;
  fixture.authError = false;
  fixture.loading.mockClear();
  fixture.apiFetch.mockReset();
});
afterEach(cleanup);

describe('mounted content participates in page readiness', () => {
  it('keeps account loading until auth settles and renders the error as ready content', () => {
    const view = render(<WhiteAccountShowcase locale="ru" />);
    expect(fixture.loading).toHaveBeenLastCalledWith(true);
    expect(view.container.querySelector('[data-page-skeleton="account"]')).not.toBeNull();
    fixture.ready = true;
    fixture.authError = true;
    view.rerender(<WhiteAccountShowcase locale="ru" />);
    expect(fixture.loading).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('alert')).toHaveTextContent('errors.verificationUnavailable');
    expect(view.container.querySelector('[data-page-skeleton="account"]')).toBeNull();
  });

  it.each(['resolve', 'reject'] as const)('settles a care editor request on %s', async (outcome) => {
    let resolve!: (value: unknown) => void;
    let reject!: (reason: Error) => void;
    fixture.apiFetch.mockReturnValue(new Promise((yes, no) => {resolve = yes; reject = no;}));
    const view = render(<EditCareGuidePage />);
    expect(fixture.loading).toHaveBeenLastCalledWith(true);
    expect(view.container.querySelector('[data-page-skeleton="admin-form"]')).not.toBeNull();
    await act(async () => {
      if (outcome === 'reject') reject(new Error('Fixture unavailable'));
      else resolve({id: 'guide-a', title: 'Guide', careSymbols: '[]'});
    });
    expect(fixture.loading).toHaveBeenLastCalledWith(false);
    expect(view.container.querySelector('[data-page-skeleton="admin-form"]')).toBeNull();
    if (outcome === 'reject') expect(screen.getByRole('alert')).toHaveTextContent('loadFailed');
    else expect(screen.getByText('Care editor ready')).toBeVisible();
  });

  it('exposes bag and favourites hydration before displaying empty content', () => {
    const commits: boolean[][] = [];
    function Probe() {
      const bag = useWhiteBag();
      const favourites = useWhiteFavourites();
      useLayoutEffect(() => {commits.push([bag.ready, favourites.ready]);});
      return null;
    }
    render(<Probe />);
    expect(commits[0]).toEqual([false, false]);
    expect(commits.at(-1)).toEqual([true, true]);
  });
});

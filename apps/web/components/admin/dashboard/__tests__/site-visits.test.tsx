import {render, screen, within} from '@testing-library/react';
import {describe, it, expect, vi, beforeEach} from 'vitest';
import {SiteVisits, type SiteDay} from '../site-visits';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key} ${JSON.stringify(values)}` : key,
}));

// recharts в jsdom не меряет контейнер и ничего не рисует. Ряд проверяем по
// тому, что в него передано, — рисование к карточке отношения не имеет.
vi.mock('../series-chart', () => ({
  SeriesChart: ({data}: {data: {date: string; count: number}[]}) => (
    <div data-testid="series">{data.map((p) => `${p.date}:${p.count}`).join(',')}</div>
  ),
}));

const apiFetch = vi.fn();
vi.mock('../../../../lib/api', () => ({
  apiFetch: (path: string) => apiFetch(path),
}));

function day(date: string, over: Partial<SiteDay> = {}): SiteDay {
  return {
    date,
    pageViews: 0,
    sessions: 0,
    productViews: 0,
    marketplaceClicks: 0,
    addToCart: 0,
    addToFavourite: 0,
    signups: 0,
    byDevice: {},
    byLocale: {},
    byMarketplace: {},
    ...over,
  };
}

function respond(days: SiteDay[] | Error, paths: {path: string; views: number}[] | Error = []) {
  apiFetch.mockImplementation((path: string) => {
    const value = path.startsWith('/api/admin/stats/site-daily') ? days : paths;
    return value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
  });
}

function cell(label: string): HTMLElement {
  return screen.getByText(label).parentElement as HTMLElement;
}

describe('SiteVisits', () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it('складывает сутки в итоги за период', async () => {
    respond([
      day('2026-09-22', {pageViews: 10, sessions: 4, productViews: 3, marketplaceClicks: 2, addToCart: 1}),
      day('2026-09-23', {pageViews: 5, sessions: 2, productViews: 1, marketplaceClicks: 1, addToFavourite: 2}),
    ]);
    render(<SiteVisits />);

    await screen.findByTestId('series');
    expect(within(cell('dashboardPage.visitsPageViews')).getByText('15')).toBeInTheDocument();
    expect(within(cell('dashboardPage.visitsSessions')).getByText('6')).toBeInTheDocument();
    expect(within(cell('dashboardPage.visitsProductViews')).getByText('4')).toBeInTheDocument();
    expect(within(cell('dashboardPage.visitsMarketplaceClicks')).getByText('3')).toBeInTheDocument();
    expect(within(cell('dashboardPage.visitsAddToCart')).getByText('1')).toBeInTheDocument();
    expect(within(cell('dashboardPage.visitsAddToFavourite')).getByText('2')).toBeInTheDocument();
  });

  it('рисует просмотры по дням, пустые сутки — нулём, а не дырой', async () => {
    respond([day('2026-09-22', {pageViews: 7}), day('2026-09-23'), day('2026-09-24', {pageViews: 2})]);
    render(<SiteVisits />);

    expect(await screen.findByTestId('series')).toHaveTextContent(
      '2026-09-22:7,2026-09-23:0,2026-09-24:2',
    );
  });

  it('устройства складываются по всем суткам', async () => {
    respond([
      day('2026-09-22', {pageViews: 4, byDevice: {phone: 3, desktop: 1}}),
      day('2026-09-23', {pageViews: 2, byDevice: {phone: 2}}),
    ]);
    render(<SiteVisits />);

    const phone = await screen.findByText('dashboardPage.devicePhone');
    expect(phone.parentElement).toHaveTextContent('5');
    expect(screen.getByText('dashboardPage.deviceDesktop').parentElement).toHaveTextContent('1');
  });

  it('показывает топ страниц', async () => {
    respond([day('2026-09-23', {pageViews: 9})], [
      {path: '/ru', views: 6},
      {path: '/ru/products/linen-shirt', views: 3},
    ]);
    render(<SiteVisits />);

    expect(await screen.findByText('/ru/products/linen-shirt')).toBeInTheDocument();
    expect(screen.getByText('/ru')).toBeInTheDocument();
  });

  it('ни одного просмотра за период — пишет это словами, без графика нулей', async () => {
    respond([day('2026-09-22'), day('2026-09-23')]);
    render(<SiteVisits />);

    expect(await screen.findByText('dashboardPage.noVisits')).toBeInTheDocument();
    expect(screen.queryByTestId('series')).not.toBeInTheDocument();
  });

  // Карточка грузится отдельно от остального дашборда: упавшая ручка посещений
  // не должна уносить с собой заказы и склад.
  it('ошибка ручки — своя строка в карточке, а не исключение наружу', async () => {
    respond(new Error('500'));
    render(<SiteVisits />);

    expect(await screen.findByText('dashboardPage.visitsLoadFailed')).toBeInTheDocument();
  });

  it('упал только топ страниц — сутки всё равно показаны', async () => {
    respond([day('2026-09-23', {pageViews: 9})], new Error('500'));
    render(<SiteVisits />);

    expect(await screen.findByTestId('series')).toBeInTheDocument();
    expect(screen.getByText('dashboardPage.visitsLoadFailed')).toBeInTheDocument();
  });
});

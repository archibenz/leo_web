import {act, cleanup, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, expect, it, vi} from 'vitest';
import {NextIntlClientProvider} from 'next-intl';
import ruMessages from '../../../../../messages/ru.json';
import AdminDashboardPage from '../page';

const {apiFetch} = vi.hoisted(() => ({apiFetch: vi.fn()}));
vi.mock('../../../../../lib/api', () => ({apiFetch}));
vi.mock('next/navigation', () => ({usePathname: () => '/ru/admin'}));
vi.mock('../../../../../components/admin/dashboard/site-visits', () => ({SiteVisits: () => null}));
vi.mock('../../../../../components/admin/dashboard/series-chart', () => ({SeriesChart: () => null}));
afterEach(cleanup);

it('keeps the dashboard and alert visible while acknowledgement is pending or failed', async () => {
  let reject!: (reason: Error) => void;
  const pending = new Promise((_, fail) => {reject = fail;});
  apiFetch.mockImplementation((path: string, init?: RequestInit) => {
    if (init?.method === 'POST') return pending;
    if (path === '/api/admin/alerts') return Promise.resolve([{id: 'alert-1', productTitle: 'Лея', alertType: 'out_of_stock', currentStock: 0}]);
    if (path === '/api/admin/dashboard') return Promise.resolve({totalAlerts: 1, totalUsers: 10, totalOrders: 0,
      totalProducts: 1, totalCollections: 0, lowStockCount: 0, outOfStockCount: 1,
      totalRevenue: 0, newUsers7d: 0, newOrders7d: 0, revenue7d: 0, totalBotVisits: 0, botVisits7d: 0, uniqueBotUsers7d: 0});
    return Promise.resolve([]);
  });
  const user = userEvent.setup();
  render(<NextIntlClientProvider locale="ru" messages={ruMessages as never}><AdminDashboardPage /></NextIntlClientProvider>);
  const button = await screen.findByRole('button', {name: ruMessages.admin.alert.acknowledge});
  await user.click(button);
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute('aria-busy', 'true');
  expect(screen.getByText(ruMessages.admin.dashboardPage.businessMetrics)).toBeInTheDocument();
  await act(async () => reject(new Error('offline')));
  expect(screen.getByText(ruMessages.admin.dashboardPage.businessMetrics)).toBeInTheDocument();
  expect(screen.getByText('Лея')).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Не удалось подтвердить');
  expect(screen.getByRole('button', {name: ruMessages.admin.alert.acknowledge})).toBeEnabled();
});

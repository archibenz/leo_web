'use client';

import {useState, useEffect} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {HomeIcon} from 'lucide-react';
import AdminLayout from '../../../../components/admin/AdminLayout';
import BrandLoader from '../../../../components/BrandLoader';
import EditModeSwitch from '../../../../components/editor/EditModeSwitch';
import {apiFetch} from '../../../../lib/api';
import {Button} from '../../../../components/ui/button';
import {Panel, PanelEmpty} from '../../../../components/admin/dashboard/panel';
import {Stat, StatGrid} from '../../../../components/admin/dashboard/stat-grid';
import {SeriesChart} from '../../../../components/admin/dashboard/series-chart';
import {ShareList} from '../../../../components/admin/dashboard/share-list';
import {OrdersTable} from '../../../../components/admin/dashboard/orders-table';
import {AlertsList} from '../../../../components/admin/dashboard/alerts-list';

type Dashboard = {
  totalProducts: number;
  totalCollections: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalAlerts: number;
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  newUsers7d: number;
  newOrders7d: number;
  revenue7d: number;
  totalBotVisits: number;
  botVisits7d: number;
  uniqueBotUsers7d: number;
};

type Alert = {
  id: string;
  productId: string;
  productTitle: string;
  alertType: string;
  currentStock: number;
  createdAt: string;
};

type RecentOrder = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  status: string;
  total: number;
  itemsCount: number;
  createdAt: string;
};

type RegistrationPoint = {
  date: string;
  count: number;
};

type BotVisitPoint = {
  date: string;
  count: number;
  uniqueUsers: number;
};

type TopProduct = {
  productId: string;
  title: string;
  count: number;
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Известные статусы заказа — то же множество ключей, что раньше жило в
// STATUS_LABELS. Неизвестный статус (защитный случай на «а вдруг бэкенд
// пришлёт что-то новое») по-прежнему показывает сырую строку, не падает —
// только раскраска сменилась с разноцветных Tailwind-пилюль на палитру
// витрины (SIGNAL — только для «отменён», см. AdminTag).
const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'] as const;
type OrderStatus = (typeof ORDER_STATUSES)[number];
function isKnownStatus(status: string): status is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(status);
}

export default function AdminDashboardPage() {
  const t = useTranslations('admin');
  const pathname = usePathname() || '/';
  const locale = pathname.split('/')[1] || 'ru';
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationPoint[]>([]);
  const [botVisits, setBotVisits] = useState<BotVisitPoint[]>([]);
  const [topFavorites, setTopFavorites] = useState<TopProduct[]>([]);
  const [topCarts, setTopCarts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<Dashboard>('/api/admin/dashboard'),
      apiFetch<Alert[]>('/api/admin/alerts'),
      apiFetch<RecentOrder[]>('/api/admin/orders/recent'),
      apiFetch<RegistrationPoint[]>('/api/admin/stats/registrations?days=30'),
      apiFetch<BotVisitPoint[]>('/api/admin/stats/bot-visits?days=30'),
      apiFetch<TopProduct[]>('/api/admin/stats/top-products?eventType=add_to_favorite&days=30&limit=5'),
      apiFetch<TopProduct[]>('/api/admin/stats/top-products?eventType=add_to_cart&days=30&limit=5'),
    ])
      .then(([dash, al, orders, regs, visits, favs, carts]) => {
        setDashboard(dash);
        setAlerts(al);
        setRecentOrders(orders);
        setRegistrations(regs);
        setBotVisits(visits);
        setTopFavorites(favs);
        setTopCarts(carts);
      })
      .catch((err: unknown) => {
        // Previously swallowed silently — partial 403/500 left an empty dashboard
        // with no feedback. Surface the failure so the admin knows to retry.
        const status = (err as {status?: number})?.status;
        setLoadError(status === 403 ? 'forbidden' : 'load_failed');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAcknowledge = async (id: string) => {
    try {
      await apiFetch(`/api/admin/alerts/${id}/acknowledge`, {method: 'POST'});
      setAlerts(prev => prev.filter(a => a.id !== id));
      if (dashboard) {
        setDashboard({...dashboard, totalAlerts: dashboard.totalAlerts - 1});
      }
    } catch {
      // Previously swallowed silently — admin saw the alert "disappear" but
      // the backend never acknowledged it. Surface a load-level error so they
      // know to reload.
      setLoadError('load_failed');
    }
  };

  const statusLabel = (status: string) =>
    isKnownStatus(status) ? t(`dashboardPage.status.${status}`) : status;

  const peakVisits = botVisits.length ? Math.max(...botVisits.map((v) => v.count)) : 0;
  const peakUnique = botVisits.length ? Math.max(...botVisits.map((v) => v.uniqueUsers)) : 0;

  return (
    <AdminLayout>
      {/* Своего белого полотна здесь больше нет. Прежде страница красила себя
          сама и отрицательными отступами отменяла поля общей оболочки — тогда
          это было необходимо, потому что оболочка стояла на тёмном фоне
          прежней темы. Оболочка переехала на блок Efferd и приносит и белый
          фон, и поля; повтор того же здесь дал бы двойные отступы.
          Ритм между блоками задаётся одним правилом `*:mb-6`, как в
          `dashboard-7`, а не отступом у каждого раздела по отдельности. */}
      <div className="*:mb-6 last:*:mb-0">
        <h1 className="font-display text-[clamp(24px,2.4vw,32px)] leading-none">{t('dashboard')}</h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <BrandLoader size={32} />
          </div>
        ) : loadError ? (
          <Panel>
            <div className="space-y-4 text-center">
              <p className="text-[13px]">
                {loadError === 'forbidden'
                  ? t('dashboardPage.forbidden')
                  : t('dashboardPage.loadFailed')}
              </p>
              <Button onClick={() => window.location.reload()}>
                {t('dashboardPage.refresh')}
              </Button>
            </div>
          </Panel>
        ) : (
          <>
            {dashboard && (
              <Panel title={t('dashboardPage.businessMetrics')}>
                <StatGrid>
                  <Stat
                    delta={
                      dashboard.newUsers7d > 0
                        ? t('dashboardPage.deltaWeek', {n: dashboard.newUsers7d})
                        : undefined
                    }
                    label={t('dashboardPage.totalUsers')}
                    value={dashboard.totalUsers.toString()}
                  />
                  {/* Ноль с причиной. Оплата ещё не включена, и крупный «0»
                      читался бы как «продажи упали». Требование владельца. */}
                  <Stat
                    delta={
                      dashboard.newOrders7d > 0
                        ? t('dashboardPage.deltaWeek', {n: dashboard.newOrders7d})
                        : undefined
                    }
                    empty={dashboard.totalOrders === 0}
                    label={t('dashboardPage.totalOrders')}
                    value={
                      dashboard.totalOrders === 0
                        ? t('dashboardPage.ordersZeroReason')
                        : dashboard.totalOrders.toString()
                    }
                  />
                  <Stat
                    delta={
                      dashboard.revenue7d > 0
                        ? t('dashboardPage.deltaWeekMoney', {amount: formatMoney(dashboard.revenue7d)})
                        : undefined
                    }
                    empty={dashboard.totalRevenue === 0}
                    label={t('dashboardPage.totalRevenue')}
                    value={
                      dashboard.totalRevenue === 0
                        ? t('dashboardPage.revenueZeroReason')
                        : formatMoney(dashboard.totalRevenue)
                    }
                  />
                </StatGrid>
              </Panel>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Panel title={t('dashboardPage.registrationsTitle')}>
                {registrations.length === 0 ? (
                  <PanelEmpty>{t('dashboardPage.noRegistrations')}</PanelEmpty>
                ) : (
                  <SeriesChart
                    data={registrations}
                    label={t('dashboardPage.registrationsTitle')}
                    totalLabel={t('dashboardPage.totalForPeriod')}
                  />
                )}
              </Panel>

              <Panel title={t('dashboardPage.botVisitsTitle')}>
                {botVisits.length === 0 ? (
                  <PanelEmpty>{t('dashboardPage.noBotVisits')}</PanelEmpty>
                ) : (
                  <>
                    <SeriesChart
                      color="hsl(var(--sh-chart-2))"
                      data={botVisits.map((v) => ({date: v.date, count: v.count}))}
                      label={t('dashboardPage.botVisitsTitle')}
                      totalLabel={t('dashboardPage.totalForPeriod')}
                    />
                    <p className="mt-3 text-muted-foreground text-[12px]">
                      {t('dashboardPage.peakDay')}:{' '}
                      <span className="text-foreground tabular-nums">{peakVisits}</span>{' '}
                      {t('dashboardPage.visitsWord')} ({peakUnique} {t('dashboardPage.uniqueShort')})
                    </p>
                  </>
                )}
              </Panel>
            </div>

            {dashboard && (
              <Panel title={t('dashboardPage.telegramBot')}>
                <StatGrid>
                  <Stat
                    delta={
                      dashboard.botVisits7d > 0
                        ? t('dashboardPage.deltaWeek', {n: dashboard.botVisits7d})
                        : undefined
                    }
                    label={t('dashboardPage.totalVisits')}
                    value={dashboard.totalBotVisits.toString()}
                  />
                  <Stat
                    delta={t('dashboardPage.last7Days')}
                    label={t('dashboardPage.uniqueUsers7d')}
                    value={dashboard.uniqueBotUsers7d.toString()}
                  />
                  <Stat
                    label={t('dashboardPage.visitsWeek')}
                    value={dashboard.botVisits7d.toString()}
                  />
                </StatGrid>
              </Panel>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Panel title={t('dashboardPage.byFavorites')}>
                <ShareList
                  emptyText={t('dashboardPage.noPeriodData')}
                  items={topFavorites.map((p) => ({id: p.productId, title: p.title, count: p.count}))}
                />
              </Panel>
              <Panel title={t('dashboardPage.byCarts')}>
                <ShareList
                  emptyText={t('dashboardPage.noPeriodData')}
                  items={topCarts.map((p) => ({id: p.productId, title: p.title, count: p.count}))}
                />
              </Panel>
            </div>

            {dashboard && (
              <Panel title={t('dashboardPage.catalogTitle')}>
                <StatGrid className="md:grid-cols-4">
                  <Stat label={t('stats.totalProducts')} value={dashboard.totalProducts.toString()} />
                  <Stat
                    label={t('stats.totalCollections')}
                    value={dashboard.totalCollections.toString()}
                  />
                  <Stat
                    label={t('stats.lowStock')}
                    value={dashboard.lowStockCount.toString()}
                    warn={dashboard.lowStockCount > 0}
                  />
                  <Stat
                    label={t('stats.outOfStock')}
                    value={dashboard.outOfStockCount.toString()}
                    warn={dashboard.outOfStockCount > 0}
                  />
                </StatGrid>
              </Panel>
            )}

            <Panel title={t('dashboardPage.recentOrdersTitle')}>
              <OrdersTable
                formatDate={formatDate}
                formatMoney={formatMoney}
                labels={{
                  client: t('dashboardPage.client'),
                  status: t('dashboardPage.statusHeader'),
                  sum: t('dashboardPage.sum'),
                  items: t('dashboardPage.items'),
                  date: t('dashboardPage.date'),
                  empty: t('dashboardPage.noOrders'),
                }}
                orders={recentOrders}
                statusLabel={statusLabel}
              />
            </Panel>

            <Panel title={`${t('alerts')}${alerts.length > 0 ? ` (${alerts.length})` : ''}`}>
              <AlertsList
                alerts={alerts}
                labels={{
                  outOfStock: t('alert.outOfStock'),
                  lowStock: t('alert.lowStock'),
                  current: t('alert.current'),
                  acknowledge: t('alert.acknowledge'),
                  empty: t('alert.noAlerts'),
                }}
                onAcknowledge={handleAcknowledge}
              />
            </Panel>

            <Link
              className="flex items-center gap-4 rounded-lg p-4 ring-1 ring-border transition-colors hover:bg-muted md:p-5"
              href={`/${locale}/admin/homepage`}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md ring-1 ring-border">
                <HomeIcon className="size-5" />
              </span>
              <span>
                <span className="block text-[13px]">{t('homepageSettings')}</span>
                <span className="block text-muted-foreground text-[12px]">{t('homepageDesc')}</span>
              </span>
            </Link>
          </>
        )}

        {/* Второе место выключателя — владелец назвал оба. Стоит СНАРУЖИ веток
            загрузки и ошибки нарочно: провал статистики не должен уносить с
            собой единственный вход в режим правки.
            framed={false} — рамку даёт Panel. Своя черта выключателя рисуется
            цветом текста, то есть почти чёрным, и на белом полотне давала
            тяжёлую линию во всю ширину, тогда как все прочие линии здесь
            волосяные. */}
        <Panel title={t('dashboardPage.editModeTitle')}>
          <EditModeSwitch framed={false} />
        </Panel>
      </div>
    </AdminLayout>
  );
}

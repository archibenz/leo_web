'use client';

import {useState, useEffect} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '../../../../components/admin/AdminLayout';
import BrandLoader from '../../../../components/BrandLoader';
import EditModeSwitch from '../../../../components/editor/EditModeSwitch';
import {apiFetch} from '../../../../lib/api';
import {AdminButton, AdminCard, AdminHeading, AdminSectionLabel, AdminStat, AdminTag} from '../../../../components/admin/AdminPrimitives';
import {HAIR, INK, MUTED} from '../../wv-palette';

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

  return (
    <AdminLayout>
      {/* AdminLayout's <main> is deliberately unpainted (shared by every
          admin page, see its own comment) — this wrapper supplies the white
          canvas for the dashboard specifically. Negative margins cancel
          <main>'s own padding (px-4 py-6 sm:px-6 lg:px-8 lg:py-8) so the
          white background reaches main's full box instead of leaving a dark
          ambient-body frame around a smaller white card, then the same
          padding is re-applied so the content sits exactly where it did
          before. min-h-[70vh] keeps the loading/error states from leaving a
          bare strip of dark ambient below a short card — not 100vh: that
          would double-count the mobile topbar's height and force a scroll
          the acceptance test explicitly forbids ("дашборд виден без
          прокрутки"). */}
      <div
        className="-mx-4 -my-6 min-h-[70vh] space-y-8 bg-white px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:-my-8 lg:px-8 lg:py-8"
        style={{color: INK}}
      >
        <AdminHeading as="h1">{t('dashboard')}</AdminHeading>

        {loading ? (
          <div className="flex items-center justify-center py-20" style={{color: INK}}>
            <BrandLoader size={32} />
          </div>
        ) : loadError ? (
          <AdminCard className="text-center">
            <p className="mb-2 text-[13px]" style={{color: INK}}>
              {loadError === 'forbidden' ? t('dashboardPage.forbidden') : t('dashboardPage.loadFailed')}
            </p>
            <AdminButton tone="solid" onClick={() => window.location.reload()}>
              {t('dashboardPage.refresh')}
            </AdminButton>
          </AdminCard>
        ) : (
          <>
            {/* Business KPI — главные метрики для директора */}
            {dashboard && (
              <section className="space-y-3">
                <AdminSectionLabel>{t('dashboardPage.businessMetrics')}</AdminSectionLabel>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                  <AdminStat
                    label={t('dashboardPage.totalUsers')}
                    value={dashboard.totalUsers.toString()}
                    delta={dashboard.newUsers7d > 0 ? t('dashboardPage.deltaWeek', {n: dashboard.newUsers7d}) : undefined}
                  />
                  <AdminStat
                    label={t('dashboardPage.totalOrders')}
                    value={dashboard.totalOrders === 0 ? t('dashboardPage.ordersZeroReason') : dashboard.totalOrders.toString()}
                    empty={dashboard.totalOrders === 0}
                    delta={dashboard.newOrders7d > 0 ? t('dashboardPage.deltaWeek', {n: dashboard.newOrders7d}) : undefined}
                  />
                  <AdminStat
                    label={t('dashboardPage.totalRevenue')}
                    value={dashboard.totalRevenue === 0 ? t('dashboardPage.revenueZeroReason') : formatMoney(dashboard.totalRevenue)}
                    empty={dashboard.totalRevenue === 0}
                    delta={dashboard.revenue7d > 0 ? t('dashboardPage.deltaWeekMoney', {amount: formatMoney(dashboard.revenue7d)}) : undefined}
                  />
                </div>
              </section>
            )}

            {/* График регистраций за 30 дней */}
            <section className="space-y-3">
              <h2 className="font-display text-lg" style={{color: INK}}>{t('dashboardPage.registrationsTitle')}</h2>
              <AdminCard>
                {registrations.length === 0 ? (
                  <p className="text-[13px]" style={{color: MUTED}}>{t('dashboardPage.noRegistrations')}</p>
                ) : (
                  <RegistrationChart data={registrations} ariaLabel={t('dashboardPage.registrationsTitle')} />
                )}
              </AdminCard>
            </section>

            {/* Phase D — Telegram бот KPI */}
            {dashboard && (
              <section className="space-y-3">
                <AdminSectionLabel>{t('dashboardPage.telegramBot')}</AdminSectionLabel>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                  <AdminStat
                    label={t('dashboardPage.totalVisits')}
                    value={dashboard.totalBotVisits.toString()}
                    delta={dashboard.botVisits7d > 0 ? t('dashboardPage.deltaWeek', {n: dashboard.botVisits7d}) : undefined}
                  />
                  <AdminStat
                    label={t('dashboardPage.uniqueUsers7d')}
                    value={dashboard.uniqueBotUsers7d.toString()}
                    delta={t('dashboardPage.last7Days')}
                  />
                  <AdminStat
                    label={t('dashboardPage.visitsWeek')}
                    value={dashboard.botVisits7d.toString()}
                  />
                </div>
              </section>
            )}

            {/* Phase E — График визитов бота */}
            <section className="space-y-3">
              <h2 className="font-display text-lg" style={{color: INK}}>{t('dashboardPage.botVisitsTitle')}</h2>
              <AdminCard>
                {botVisits.length === 0 ? (
                  <p className="text-[13px]" style={{color: MUTED}}>{t('dashboardPage.noBotVisits')}</p>
                ) : (
                  <>
                    <RegistrationChart
                      data={botVisits.map(v => ({date: v.date, count: v.count}))}
                      color={MUTED}
                      ariaLabel={t('dashboardPage.botVisitsTitle')}
                    />
                    <p className="mt-2 text-[12px]" style={{color: MUTED}}>
                      {t('dashboardPage.peakDay')}:{' '}
                      <span style={{color: INK}}>
                        {Math.max(...botVisits.map(v => v.count), 0)}
                      </span>
                      {' '}{t('dashboardPage.visitsWord')} ({Math.max(...botVisits.map(v => v.uniqueUsers), 0)} {t('dashboardPage.uniqueShort')})
                    </p>
                  </>
                )}
              </AdminCard>
            </section>

            {/* Phase F — Топ товаров */}
            <section className="space-y-3">
              <h2 className="font-display text-lg" style={{color: INK}}>{t('dashboardPage.topProductsTitle')}</h2>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <TopProductsCard title={t('dashboardPage.byFavorites')} items={topFavorites} emptyText={t('dashboardPage.noPeriodData')} />
                <TopProductsCard title={t('dashboardPage.byCarts')} items={topCarts} emptyText={t('dashboardPage.noPeriodData')} />
              </div>
            </section>

            {/* Каталог — операционные метрики */}
            {dashboard && (
              <section className="space-y-3">
                <AdminSectionLabel>{t('dashboardPage.catalogTitle')}</AdminSectionLabel>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                  <AdminStat label={t('stats.totalProducts')} value={dashboard.totalProducts} />
                  <AdminStat label={t('stats.totalCollections')} value={dashboard.totalCollections} />
                  <AdminStat label={t('stats.lowStock')} value={dashboard.lowStockCount} tone={dashboard.lowStockCount > 0 ? 'warn' : 'default'} />
                  <AdminStat label={t('stats.outOfStock')} value={dashboard.outOfStockCount} tone={dashboard.outOfStockCount > 0 ? 'warn' : 'default'} />
                </div>
              </section>
            )}

            {/* Последние заказы */}
            <section className="space-y-3">
              <h2 className="font-display text-lg" style={{color: INK}}>{t('dashboardPage.recentOrdersTitle')}</h2>
              {recentOrders.length === 0 ? (
                <p className="text-[13px]" style={{color: MUTED}}>{t('dashboardPage.noOrders')}</p>
              ) : (
                <div className="overflow-hidden border" style={{borderColor: HAIR}}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b text-[11px] uppercase tracking-[0.1em]" style={{borderColor: HAIR, color: MUTED}}>
                          <th className="px-4 py-3 text-left font-normal">{t('dashboardPage.client')}</th>
                          <th className="px-4 py-3 text-left font-normal">{t('dashboardPage.statusHeader')}</th>
                          <th className="px-4 py-3 text-right font-normal">{t('dashboardPage.sum')}</th>
                          <th className="px-4 py-3 text-right font-normal">{t('dashboardPage.items')}</th>
                          <th className="px-4 py-3 text-right font-normal">{t('dashboardPage.date')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map(order => {
                          const statusLabel = isKnownStatus(order.status) ? t(`dashboardPage.status.${order.status}`) : order.status;
                          const statusTone = order.status === 'cancelled' ? 'negative' : 'neutral';
                          return (
                            <tr key={order.id} className="border-b last:border-0" style={{borderColor: HAIR}}>
                              <td className="px-4 py-3">
                                <div style={{color: INK}}>{order.customerName}</div>
                                {order.customerEmail && (
                                  <div className="text-[12px]" style={{color: MUTED}}>{order.customerEmail}</div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <AdminTag tone={statusTone}>{statusLabel}</AdminTag>
                              </td>
                              <td className="px-4 py-3 text-right" style={{color: INK}}>
                                {formatMoney(order.total)}
                              </td>
                              <td className="px-4 py-3 text-right" style={{color: MUTED}}>
                                {order.itemsCount}
                              </td>
                              <td className="px-4 py-3 text-right text-[12px]" style={{color: MUTED}}>
                                {formatDate(order.createdAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

            {/* Quick Links */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Link
                href={`/${locale}/admin/homepage`}
                className="flex items-center gap-4 border p-5 transition-colors hover:bg-black/[0.02]"
                style={{borderColor: HAIR}}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border" style={{borderColor: HAIR}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px]" style={{color: INK}}>{t('homepageSettings')}</p>
                  <p className="text-[12px]" style={{color: MUTED}}>{t('homepageDesc')}</p>
                </div>
              </Link>
            </section>

            {/* Alerts */}
            <section className="space-y-3">
              <h2 className="font-display text-lg" style={{color: INK}}>{t('alerts')} {alerts.length > 0 && `(${alerts.length})`}</h2>
              {alerts.length === 0 ? (
                <p className="text-[13px]" style={{color: MUTED}}>{t('alert.noAlerts')}</p>
              ) : (
                <div className="space-y-2">
                  {alerts.map(alert => (
                    <AdminCard key={alert.id} className="flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <AdminTag tone={alert.alertType === 'out_of_stock' ? 'negative' : 'neutral'}>
                            {alert.alertType === 'out_of_stock' ? t('alert.outOfStock') : t('alert.lowStock')}
                          </AdminTag>
                          <span className="text-[13px]" style={{color: INK}}>{alert.productTitle}</span>
                        </div>
                        <p className="text-[12px]" style={{color: MUTED}}>
                          {t('alert.current')}: {alert.currentStock}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="min-h-11 px-2 text-[13px] uppercase tracking-[0.06em] transition-colors"
                        style={{color: MUTED}}
                      >
                        {t('alert.acknowledge')}
                      </button>
                    </AdminCard>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* Второе место выключателя — он назвал оба. Не внутри loading/
            loadError веток дашборда: провал статистики не должен уносить с
            собой единственный вход в режим правки. */}
        <EditModeSwitch />
      </div>
    </AdminLayout>
  );
}

type LinePoint = {date: string; count: number};

function RegistrationChart({
  data,
  color = INK,
  ariaLabel = 'График',
}: {
  data: LinePoint[];
  color?: string;
  ariaLabel?: string;
}) {
  const W = 640;
  const H = 220;
  const PL = 36;
  const PR = 16;
  const PT = 16;
  const PB = 28;
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;

  const counts = data.map(d => d.count);
  const max = Math.max(...counts, 1);
  const total = counts.reduce((a, b) => a + b, 0);

  const stepX = innerW / Math.max(data.length - 1, 1);
  const points = data.map((d, i) => ({
    x: PL + i * stepX,
    y: PT + innerH - (d.count / max) * innerH,
    ...d,
  }));

  const path = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ',' + p.y).join(' ');
  const areaPath =
    points.length > 0
      ? `${path} L${points[points.length - 1].x},${PT + innerH} L${points[0].x},${PT + innerH} Z`
      : '';

  const yTicks = [0, Math.ceil(max / 2), max];
  const firstDate = data[0]?.date;
  const lastDate = data[data.length - 1]?.date;
  const fmtAxis = (iso: string | undefined) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', {day: '2-digit', month: 'short'});
  };

  return (
    <div className="space-y-2" style={{color: MUTED}}>
      <div className="flex items-baseline justify-between text-[12px]">
        <p className="uppercase tracking-[0.08em]">
          Всего за период: <span style={{color: INK}}>{total}</span>
        </p>
        <p>{fmtAxis(firstDate)} — {fmtAxis(lastDate)}</p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={ariaLabel}>
        {yTicks.map((tick, i) => {
          const y = PT + innerH - (tick / max) * innerH;
          return (
            <g key={i}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke={HAIR} strokeDasharray="2 3" />
              <text x={PL - 6} y={y + 3} textAnchor="end" className="text-[10px] fill-current">
                {tick}
              </text>
            </g>
          );
        })}
        {areaPath && <path d={areaPath} fill={color} fillOpacity={0.1} />}
        <path d={path} stroke={color} strokeWidth={2} fill="none" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill={color} />
            <title>{`${fmtAxis(p.date)}: ${p.count}`}</title>
          </g>
        ))}
        {firstDate && (
          <text x={PL} y={H - 8} textAnchor="start" className="text-[10px] fill-current">
            {fmtAxis(firstDate)}
          </text>
        )}
        {lastDate && (
          <text x={W - PR} y={H - 8} textAnchor="end" className="text-[10px] fill-current">
            {fmtAxis(lastDate)}
          </text>
        )}
      </svg>
    </div>
  );
}

function TopProductsCard({title, items, emptyText}: {title: string; items: TopProduct[]; emptyText: string}) {
  return (
    <AdminCard>
      <h3 className="mb-3 text-[13px]" style={{color: INK}}>{title}</h3>
      {items.length === 0 ? (
        <p className="text-[13px]" style={{color: MUTED}}>{emptyText}</p>
      ) : (
        <ol className="space-y-2">
          {items.map((p, i) => {
            const max = Math.max(...items.map(x => x.count), 1);
            const pct = Math.max(2, Math.round((p.count / max) * 100));
            return (
              <li key={p.productId} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="truncate" style={{color: INK}}>
                    <span className="mr-2" style={{color: MUTED}}>{i + 1}.</span>
                    {p.title}
                  </span>
                  <span className="shrink-0 text-[12px]" style={{color: MUTED}}>{p.count}</span>
                </div>
                <div className="h-1 w-full overflow-hidden" style={{background: HAIR}}>
                  <div className="h-full" style={{width: `${pct}%`, background: INK}} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </AdminCard>
  );
}

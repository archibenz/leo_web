'use client';

import {useState, useEffect} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '../../../components/admin/AdminLayout';
import BrandLoader from '../../../components/BrandLoader';
import {apiFetch} from '../../../lib/api';

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

const STATUS_LABELS: Record<string, {label: string; color: string}> = {
  pending: {label: 'Ожидает', color: 'bg-yellow-500/20 text-yellow-400'},
  paid: {label: 'Оплачен', color: 'bg-blue-500/20 text-blue-400'},
  shipped: {label: 'Отправлен', color: 'bg-purple-500/20 text-purple-400'},
  delivered: {label: 'Доставлен', color: 'bg-green-500/20 text-green-400'},
  cancelled: {label: 'Отменён', color: 'bg-red-500/20 text-red-400'},
};

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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAcknowledge = async (id: string) => {
    try {
      await apiFetch(`/api/admin/alerts/${id}/acknowledge`, {method: 'POST'});
      setAlerts(prev => prev.filter(a => a.id !== id));
      if (dashboard) {
        setDashboard({...dashboard, totalAlerts: dashboard.totalAlerts - 1});
      }
    } catch {}
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <h1 className="text-2xl font-display text-[var(--ink)]">{t('dashboard')}</h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <BrandLoader size={32} />
          </div>
        ) : (
          <>
            {/* Business KPI — главные метрики для директора */}
            {dashboard && (
              <section className="space-y-3">
                <h2 className="text-xs uppercase tracking-wider text-[var(--ink-soft)]">
                  Бизнес-метрики
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <BigStatCard
                    label="Всего пользователей"
                    value={dashboard.totalUsers.toString()}
                    delta={dashboard.newUsers7d > 0 ? `+${dashboard.newUsers7d} за неделю` : undefined}
                  />
                  <BigStatCard
                    label="Всего заказов"
                    value={dashboard.totalOrders.toString()}
                    delta={dashboard.newOrders7d > 0 ? `+${dashboard.newOrders7d} за неделю` : undefined}
                  />
                  <BigStatCard
                    label="Общая выручка"
                    value={formatMoney(dashboard.totalRevenue)}
                    delta={dashboard.revenue7d > 0 ? `+${formatMoney(dashboard.revenue7d)} за неделю` : undefined}
                  />
                </div>
              </section>
            )}

            {/* График регистраций за 30 дней */}
            <section className="space-y-3">
              <h2 className="text-lg font-medium text-[var(--ink)]">Регистрации за 30 дней</h2>
              <div className="paper-card p-4">
                {registrations.length === 0 ? (
                  <p className="text-sm text-[var(--ink-soft)]">Нет регистраций за выбранный период.</p>
                ) : (
                  <RegistrationChart data={registrations} ariaLabel="График регистраций за 30 дней" />
                )}
              </div>
            </section>

            {/* Phase D — Telegram бот KPI */}
            {dashboard && (
              <section className="space-y-3">
                <h2 className="text-xs uppercase tracking-wider text-[var(--ink-soft)]">
                  Telegram бот
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <BigStatCard
                    label="Всего визитов"
                    value={dashboard.totalBotVisits.toString()}
                    delta={dashboard.botVisits7d > 0 ? `+${dashboard.botVisits7d} за неделю` : undefined}
                  />
                  <BigStatCard
                    label="Уникальных пользователей"
                    value={dashboard.uniqueBotUsers7d.toString()}
                    delta="за последние 7 дней"
                  />
                  <BigStatCard
                    label="Визитов за неделю"
                    value={dashboard.botVisits7d.toString()}
                  />
                </div>
              </section>
            )}

            {/* Phase E — График визитов бота */}
            <section className="space-y-3">
              <h2 className="text-lg font-medium text-[var(--ink)]">Визиты бота за 30 дней</h2>
              <div className="paper-card p-4">
                {botVisits.length === 0 ? (
                  <p className="text-sm text-[var(--ink-soft)]">Нет визитов за выбранный период.</p>
                ) : (
                  <>
                    <RegistrationChart
                      data={botVisits.map(v => ({date: v.date, count: v.count}))}
                      color="#8b5cf6"
                      ariaLabel="График визитов бота за 30 дней"
                    />
                    <p className="mt-2 text-xs text-[var(--ink-soft)]">
                      Пик за день:{' '}
                      <span className="font-medium text-[var(--ink)]">
                        {Math.max(...botVisits.map(v => v.count), 0)}
                      </span>
                      {' '}визитов ({Math.max(...botVisits.map(v => v.uniqueUsers), 0)} уникальных)
                    </p>
                  </>
                )}
              </div>
            </section>

            {/* Phase F — Топ товаров */}
            <section className="space-y-3">
              <h2 className="text-lg font-medium text-[var(--ink)]">Топ товаров (30 дней)</h2>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <TopProductsCard title="По добавлениям в избранное" items={topFavorites} />
                <TopProductsCard title="По добавлениям в корзину" items={topCarts} />
              </div>
            </section>

            {/* Каталог — операционные метрики */}
            {dashboard && (
              <section className="space-y-3">
                <h2 className="text-xs uppercase tracking-wider text-[var(--ink-soft)]">
                  Каталог и склад
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <StatCard label={t('stats.totalProducts')} value={dashboard.totalProducts} />
                  <StatCard label={t('stats.totalCollections')} value={dashboard.totalCollections} />
                  <StatCard label={t('stats.lowStock')} value={dashboard.lowStockCount} warn={dashboard.lowStockCount > 0} />
                  <StatCard label={t('stats.outOfStock')} value={dashboard.outOfStockCount} warn={dashboard.outOfStockCount > 0} />
                </div>
              </section>
            )}

            {/* Последние заказы */}
            <section className="space-y-3">
              <h2 className="text-lg font-medium text-[var(--ink)]">Последние заказы</h2>
              {recentOrders.length === 0 ? (
                <p className="text-sm text-[var(--ink-soft)]">Заказов пока нет.</p>
              ) : (
                <div className="paper-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--ink)]/10 text-xs uppercase tracking-wider text-[var(--ink-soft)]">
                          <th className="px-4 py-3 text-left font-normal">Клиент</th>
                          <th className="px-4 py-3 text-left font-normal">Статус</th>
                          <th className="px-4 py-3 text-right font-normal">Сумма</th>
                          <th className="px-4 py-3 text-right font-normal">Позиций</th>
                          <th className="px-4 py-3 text-right font-normal">Дата</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map(order => {
                          const status = STATUS_LABELS[order.status] || {label: order.status, color: 'bg-gray-500/20 text-gray-400'};
                          return (
                            <tr key={order.id} className="border-b border-[var(--ink)]/5 last:border-0 hover:bg-[var(--ink)]/3 transition">
                              <td className="px-4 py-3">
                                <div className="font-medium text-[var(--ink)]">{order.customerName}</div>
                                {order.customerEmail && (
                                  <div className="text-xs text-[var(--ink-soft)]">{order.customerEmail}</div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${status.color}`}>
                                  {status.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-[var(--ink)]">
                                {formatMoney(order.total)}
                              </td>
                              <td className="px-4 py-3 text-right text-[var(--ink-soft)]">
                                {order.itemsCount}
                              </td>
                              <td className="px-4 py-3 text-right text-xs text-[var(--ink-soft)]">
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
                className="paper-card flex items-center gap-4 p-5 transition hover:bg-[var(--ink)]/3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--ink)]">{t('homepageSettings')}</p>
                  <p className="text-xs text-[var(--ink-soft)]">{t('homepageDesc')}</p>
                </div>
              </Link>
            </section>

            {/* Alerts */}
            <section className="space-y-3">
              <h2 className="text-lg font-medium text-[var(--ink)]">{t('alerts')} {alerts.length > 0 && `(${alerts.length})`}</h2>
              {alerts.length === 0 ? (
                <p className="text-sm text-[var(--ink-soft)]">{t('alert.noAlerts')}</p>
              ) : (
                <div className="space-y-2">
                  {alerts.map(alert => (
                    <div key={alert.id} className="paper-card flex items-center justify-between gap-4 p-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            alert.alertType === 'out_of_stock'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {alert.alertType === 'out_of_stock' ? t('alert.outOfStock') : t('alert.lowStock')}
                          </span>
                          <span className="text-sm font-medium text-[var(--ink)]">{alert.productTitle}</span>
                        </div>
                        <p className="text-xs text-[var(--ink-soft)]">
                          {t('alert.current')}: {alert.currentStock}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="text-xs text-[var(--ink-soft)] hover:text-[var(--ink)] transition"
                      >
                        {t('alert.acknowledge')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function StatCard({label, value, warn}: {label: string; value: number; warn?: boolean}) {
  return (
    <div className="paper-card p-4 text-center">
      <p className={`text-3xl font-display ${warn ? 'text-red-400' : 'text-[var(--ink)]'}`}>{value}</p>
      <p className="mt-1 text-xs text-[var(--ink-soft)] uppercase tracking-wider">{label}</p>
    </div>
  );
}

type LinePoint = {date: string; count: number};

function RegistrationChart({
  data,
  color = 'var(--accent)',
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
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-wider text-[var(--ink-soft)]">
          Всего за период: <span className="font-medium text-[var(--ink)]">{total}</span>
        </p>
        <p className="text-xs text-[var(--ink-soft)]">
          {fmtAxis(firstDate)} — {fmtAxis(lastDate)}
        </p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={ariaLabel}>
        {yTicks.map((tick, i) => {
          const y = PT + innerH - (tick / max) * innerH;
          return (
            <g key={i}>
              <line
                x1={PL}
                y1={y}
                x2={W - PR}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeDasharray="2 3"
              />
              <text x={PL - 6} y={y + 3} textAnchor="end" className="text-[10px] fill-current opacity-60">
                {tick}
              </text>
            </g>
          );
        })}
        {areaPath && <path d={areaPath} fill={color} fillOpacity={0.12} />}
        <path d={path} stroke={color} strokeWidth={2} fill="none" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill={color} />
            <title>{`${fmtAxis(p.date)}: ${p.count}`}</title>
          </g>
        ))}
        {firstDate && (
          <text x={PL} y={H - 8} textAnchor="start" className="text-[10px] fill-current opacity-60">
            {fmtAxis(firstDate)}
          </text>
        )}
        {lastDate && (
          <text x={W - PR} y={H - 8} textAnchor="end" className="text-[10px] fill-current opacity-60">
            {fmtAxis(lastDate)}
          </text>
        )}
      </svg>
    </div>
  );
}

function TopProductsCard({title, items}: {title: string; items: TopProduct[]}) {
  return (
    <div className="paper-card p-4">
      <h3 className="mb-3 text-sm font-medium text-[var(--ink)]">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--ink-soft)]">Нет данных за период.</p>
      ) : (
        <ol className="space-y-2">
          {items.map((p, i) => {
            const max = Math.max(...items.map(x => x.count), 1);
            const pct = Math.max(2, Math.round((p.count / max) * 100));
            return (
              <li key={p.productId} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-[var(--ink)]">
                    <span className="mr-2 text-[var(--ink-soft)]">{i + 1}.</span>
                    {p.title}
                  </span>
                  <span className="shrink-0 text-xs text-[var(--ink-soft)]">{p.count}</span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--ink)]/5">
                  <div
                    className="h-full bg-[var(--accent)]"
                    style={{width: `${pct}%`}}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function BigStatCard({label, value, delta}: {label: string; value: string; delta?: string}) {
  return (
    <div className="paper-card p-5">
      <p className="text-xs uppercase tracking-wider text-[var(--ink-soft)]">{label}</p>
      <p className="mt-2 text-2xl font-display text-[var(--ink)] sm:text-3xl">{value}</p>
      {delta && (
        <p className="mt-1 text-xs text-[var(--accent)]">{delta}</p>
      )}
    </div>
  );
}

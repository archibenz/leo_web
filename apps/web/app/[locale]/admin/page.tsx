'use client';

import {useState, useEffect} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '../../../components/admin/AdminLayout';
import Spinner from '../../../components/ui/Spinner';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<Dashboard>('/api/admin/dashboard'),
      apiFetch<Alert[]>('/api/admin/alerts'),
      apiFetch<RecentOrder[]>('/api/admin/orders/recent'),
    ])
      .then(([dash, al, orders]) => {
        setDashboard(dash);
        setAlerts(al);
        setRecentOrders(orders);
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
            <Spinner size="md" />
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

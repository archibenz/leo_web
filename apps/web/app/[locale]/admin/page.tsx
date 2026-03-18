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
};

type Alert = {
  id: string;
  productId: string;
  productTitle: string;
  alertType: string;
  currentStock: number;
  createdAt: string;
};

export default function AdminDashboardPage() {
  const t = useTranslations('admin');
  const pathname = usePathname() || '/';
  const locale = pathname.split('/')[1] || 'ru';
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<Dashboard>('/api/admin/dashboard'),
      apiFetch<Alert[]>('/api/admin/alerts'),
    ])
      .then(([dash, al]) => {
        setDashboard(dash);
        setAlerts(al);
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
      <div className="space-y-6">
        <h1 className="text-2xl font-display text-[var(--ink)]">{t('dashboard')}</h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="md" />
          </div>
        ) : (
          <>
            {/* Stats grid */}
            {dashboard && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label={t('stats.totalProducts')} value={dashboard.totalProducts} />
                <StatCard label={t('stats.totalCollections')} value={dashboard.totalCollections} />
                <StatCard label={t('stats.lowStock')} value={dashboard.lowStockCount} warn={dashboard.lowStockCount > 0} />
                <StatCard label={t('stats.outOfStock')} value={dashboard.outOfStockCount} warn={dashboard.outOfStockCount > 0} />
              </div>
            )}

            {/* Quick Links */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <p className="text-sm font-medium text-[var(--ink)]">Homepage Settings</p>
                  <p className="text-xs text-[var(--ink-soft)]">Featured products, collections, season</p>
                </div>
              </Link>
            </div>

            {/* Alerts */}
            <div className="space-y-3">
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
            </div>
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

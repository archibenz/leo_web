'use client';

import {useState, useEffect} from 'react';
import {useTranslations} from 'next-intl';
import AdminLayout from '../../../components/admin/AdminLayout';
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
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
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

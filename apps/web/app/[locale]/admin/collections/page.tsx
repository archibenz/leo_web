'use client';

import {useState, useEffect} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '../../../../components/admin/AdminLayout';
import {apiFetch} from '../../../../lib/api';

type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  productCount: number;
};

export default function AdminCollectionsPage() {
  const t = useTranslations('admin');
  const pathname = usePathname() || '/';
  const locale = pathname.split('/')[1] || 'ru';
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Collection[]>('/api/admin/collections')
      .then(setCollections)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(t('confirmDelete', {name}))) return;
    try {
      await apiFetch(`/api/admin/collections/${id}?permanent=true`, {method: 'DELETE'});
      setCollections(prev => prev.filter(c => c.id !== id));
    } catch {}
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display text-[var(--ink)]">{t('collections')}</h1>
          <Link
            href={`/${locale}/admin/collections/new`}
            className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--paper-base)] transition hover:opacity-90"
          >
            + {t('collection.add')}
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          </div>
        ) : collections.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">{t('collection.noCollections')}</p>
        ) : (
          <div className="space-y-2">
            {collections.map(col => (
              <div key={col.id} className="paper-card flex items-center gap-4 p-4 transition hover:bg-[var(--ink)]/3">
                <Link
                  href={`/${locale}/admin/collections/${col.id}`}
                  className="min-w-0 flex-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--ink)]">{col.name}</span>
                    {!col.active && (
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-400">
                        Inactive
                      </span>
                    )}
                  </div>
                  {col.description && (
                    <p className="mt-0.5 text-xs text-[var(--ink-soft)] truncate max-w-md">{col.description}</p>
                  )}
                </Link>
                <span className="shrink-0 text-sm text-[var(--ink-soft)]">
                  {col.productCount} {t('collection.productCount')}
                </span>
                <button
                  onClick={(e) => handleDelete(e, col.id, col.name)}
                  className="shrink-0 rounded-full p-2 text-[var(--ink-soft)] hover:bg-red-500/10 hover:text-red-400 transition"
                  title={t('deleteBtn')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

'use client';

import {useState, useEffect} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '../../../../components/admin/AdminLayout';
import BrandLoader from '../../../../components/BrandLoader';
import {apiFetch} from '../../../../lib/api';
import {CareSymbolsRow} from '../../../../components/CareSymbols';

type CareGuide = {
  id: string;
  title: string;
  description: string | null;
  careSymbols: string;
  sortOrder: number;
  active: boolean;
};

export default function AdminCarePage() {
  const t = useTranslations('admin');
  const pathname = usePathname() || '/';
  const locale = pathname.split('/')[1] || 'ru';
  const [guides, setGuides] = useState<CareGuide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<CareGuide[]>('/api/admin/care-guides')
      .then(setGuides)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const parseSymbols = (raw: string): string[] => {
    try { return JSON.parse(raw); } catch { return []; }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Удалить "${title}"?`)) return;
    try {
      await apiFetch(`/api/admin/care-guides/${id}`, {method: 'DELETE'});
      setGuides(prev => prev.filter(g => g.id !== id));
    } catch {}
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display text-[var(--ink)]">
            {locale === 'ru' ? 'Уход за одеждой' : 'Garment Care'}
          </h1>
          <Link
            href={`/${locale}/admin/care/new`}
            className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--paper-base)] transition hover:opacity-90"
          >
            + {locale === 'ru' ? 'Добавить' : 'Add'}
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <BrandLoader size={32} />
          </div>
        ) : guides.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">
            {locale === 'ru' ? 'Нет записей об уходе' : 'No care guides yet'}
          </p>
        ) : (
          <div className="space-y-2">
            {guides.map(guide => (
              <div key={guide.id} className="paper-card flex items-center gap-4 p-4 transition hover:bg-[var(--ink)]/3">
                <Link href={`/${locale}/admin/care/${guide.id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--ink)]">{guide.title}</span>
                    <span className="text-xs text-[var(--ink-soft)]">#{guide.sortOrder}</span>
                    {!guide.active && (
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-400">
                        {t('inactive')}
                      </span>
                    )}
                  </div>
                  {parseSymbols(guide.careSymbols).length > 0 && (
                    <div className="mt-2">
                      <CareSymbolsRow symbols={parseSymbols(guide.careSymbols)} locale={locale} size={20} />
                    </div>
                  )}
                </Link>
                <button
                  onClick={(e) => handleDelete(e, guide.id, guide.title)}
                  className="shrink-0 rounded-full p-2 text-[var(--ink-soft)] hover:bg-red-500/10 hover:text-red-400 transition"
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

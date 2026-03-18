'use client';

import {useState, useEffect} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '../../../../components/admin/AdminLayout';
import Spinner from '../../../../components/ui/Spinner';
import {apiFetch} from '../../../../lib/api';

type Product = {
  id: string;
  title: string;
  price: number;
  category: string | null;
  stockQuantity: number;
  isTest: boolean;
  active: boolean;
  collectionName: string | null;
};

export default function AdminProductsPage() {
  const t = useTranslations('admin');
  const pathname = usePathname() || '/';
  const locale = pathname.split('/')[1] || 'ru';
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Product[]>('/api/admin/products')
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(t('confirmDelete', {name: title}))) return;
    try {
      await apiFetch(`/api/admin/products/${id}?permanent=true`, {method: 'DELETE'});
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch {}
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display text-[var(--ink)]">{t('products')}</h1>
          <Link
            href={`/${locale}/admin/products/new`}
            className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--paper-base)] transition hover:opacity-90"
          >
            + {t('product.add')}
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="md" />
          </div>
        ) : products.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">{t('product.noProducts')}</p>
        ) : (
          <div className="space-y-2">
            {products.map(product => (
              <div key={product.id} className="paper-card flex items-center gap-4 p-4 transition hover:bg-[var(--ink)]/3">
                <Link
                  href={`/${locale}/admin/products/${product.id}`}
                  className="min-w-0 flex-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--ink)] truncate">{product.title}</span>
                    {product.isTest && (
                      <span className="rounded-full bg-[var(--accent)]/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--accent)]">
                        {t('product.demo')}
                      </span>
                    )}
                    {!product.active && (
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-400">
                        {t('inactive')}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-[var(--ink-soft)]">
                    <span>&euro;{product.price}</span>
                    {product.category && <span>{product.category}</span>}
                    {product.collectionName && <span>{product.collectionName}</span>}
                  </div>
                </Link>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-medium ${
                    product.stockQuantity === 0 ? 'text-red-400' :
                    product.stockQuantity <= 5 ? 'text-yellow-400' : 'text-[var(--ink)]'
                  }`}>
                    {product.stockQuantity}
                  </p>
                  <p className="text-[10px] text-[var(--ink-soft)] uppercase">{t('product.stock')}</p>
                </div>
                <button
                  onClick={(e) => handleDelete(e, product.id, product.title)}
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

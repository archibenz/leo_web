'use client';

import {useState, useEffect} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '../../../../components/admin/AdminLayout';
import BrandLoader from '../../../../components/BrandLoader';
import {apiFetch} from '../../../../lib/api';

type Product = {
  id: string;
  title: string;
  stockQuantity: number;
  lowStockThreshold: number;
  isTest: boolean;
  active: boolean;
};

export default function AdminInventoryPage() {
  const t = useTranslations('admin');
  const pathname = usePathname() || '/';
  const locale = pathname.split('/')[1] || 'ru';
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState(0);

  useEffect(() => {
    apiFetch<Product[]>('/api/admin/products')
      .then(data => {
        setProducts(data.filter(p => p.active && !p.isTest));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateStock = async (id: string) => {
    try {
      const updated = await apiFetch<Product>(`/api/admin/products/${id}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({quantity: editValue}),
      });
      setProducts(prev => prev.map(p => p.id === id ? {...p, stockQuantity: updated.stockQuantity} : p));
      setEditingId(null);
    } catch {}
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display text-[var(--ink)]">{t('inventory')}</h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <BrandLoader size={32} />
          </div>
        ) : products.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">{t('product.noProducts')}</p>
        ) : (
          <div className="space-y-2">
            {products.map(product => (
              <div key={product.id} className="paper-card flex items-center justify-between gap-4 p-4">
                <Link
                  href={`/${locale}/admin/products/${product.id}`}
                  className="min-w-0 flex-1"
                >
                  <span className="font-medium text-[var(--ink)]">{product.title}</span>
                </Link>

                <div className="flex items-center gap-3">
                  {editingId === product.id ? (
                    <>
                      <input
                        type="number"
                        value={editValue}
                        onChange={e => setEditValue(parseInt(e.target.value) || 0)}
                        className="admin-input w-20 text-center"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdateStock(product.id)}
                        className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs text-[var(--paper-base)]"
                      >
                        {t('ok')}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-[var(--ink-soft)]"
                      >
                        &times;
                      </button>
                    </>
                  ) : (
                    <>
                      <span className={`text-lg font-medium tabular-nums ${
                        product.stockQuantity === 0 ? 'text-red-400' :
                        product.stockQuantity <= product.lowStockThreshold ? 'text-yellow-400' : 'text-[var(--ink)]'
                      }`}>
                        {product.stockQuantity}
                      </span>
                      <button
                        onClick={() => {
                          setEditingId(product.id);
                          setEditValue(product.stockQuantity);
                        }}
                        className="text-xs text-[var(--accent)] hover:underline"
                      >
                        {t('product.updateStock')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

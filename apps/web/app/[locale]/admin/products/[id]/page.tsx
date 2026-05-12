'use client';

import {use, useState, useEffect, useCallback} from 'react';
import {useTranslations} from 'next-intl';
import AdminLayout from '../../../../../components/admin/AdminLayout';
import ProductForm from '../../../../../components/admin/ProductForm';
import BrandLoader from '../../../../../components/BrandLoader';
import {apiFetch} from '../../../../../lib/api';

type Props = {
  params: Promise<{id: string}>;
};

type RecommendedProduct = {
  id: string;
  title: string;
  price: number;
};

type ProductOption = {
  id: string;
  title: string;
  price: number;
  active: boolean;
};

export default function EditProductPage({params}: Props) {
  const {id} = use(params);
  const t = useTranslations('admin.product');

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display text-[var(--ink)]">{t('edit')}</h1>
        <div className="paper-card p-6">
          <ProductForm productId={id} />
        </div>
        <RecommendationsSection productId={id} />
      </div>
    </AdminLayout>
  );
}

function RecommendationsSection({productId}: {productId: string}) {
  const t = useTranslations('admin');
  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>([]);
  const [allProducts, setAllProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedId, setSelectedId] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [recs, prods] = await Promise.all([
        apiFetch<RecommendedProduct[]>(`/api/admin/products/${productId}/recommendations`),
        apiFetch<ProductOption[]>('/api/admin/products'),
      ]);
      setRecommendations(recs);
      setAllProducts(prods.filter(p => p.id !== productId));
    } catch {}
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const availableProducts = allProducts.filter(
    p => !recommendations.some(r => r.id === p.id)
  );

  const handleAdd = () => {
    if (!selectedId) return;
    const product = allProducts.find(p => p.id === selectedId);
    if (!product) return;
    const updated = [...recommendations, {id: product.id, title: product.title, price: product.price}];
    setRecommendations(updated);
    setSelectedId('');
  };

  const handleRemove = (removeId: string) => {
    setRecommendations(prev => prev.filter(r => r.id !== removeId));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await apiFetch(`/api/admin/products/${productId}/recommendations`, {
        method: 'PUT',
        body: JSON.stringify({productIds: recommendations.map(r => r.id)}),
      });
      setMessage(t('recommendationsSaved'));
    } catch {
      setMessage(t('recommendationsError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="paper-card p-6">
        <div className="flex items-center justify-center py-10">
          <BrandLoader size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="paper-card p-6 space-y-4">
      <h2 className="text-lg font-medium text-[var(--ink)]">{t('recommendations')}</h2>

      {/* Current recommendations */}
      {recommendations.length === 0 ? (
        <p className="text-sm text-[var(--ink-soft)]">{t('noRecommendations')}</p>
      ) : (
        <div className="space-y-2">
          {recommendations.map(rec => (
            <div key={rec.id} className="flex items-center justify-between gap-4 rounded-lg bg-[var(--ink)]/3 px-4 py-2.5">
              <div>
                <span className="text-sm font-medium text-[var(--ink)]">{rec.title}</span>
                <span className="ml-2 text-xs text-[var(--ink-soft)]">&euro;{rec.price}</span>
              </div>
              <button
                onClick={() => handleRemove(rec.id)}
                className="shrink-0 rounded-full p-1.5 text-[var(--ink-soft)] hover:bg-red-500/10 hover:text-red-400 transition"
                title={t('remove')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new recommendation */}
      <div className="flex items-center gap-3">
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="admin-input flex-1"
        >
          <option value="">{t('selectProduct')}</option>
          {availableProducts.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!selectedId}
          className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--paper-base)] transition hover:opacity-90 disabled:opacity-50"
        >
          {t('addRecommendation')}
        </button>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="lux-btn-primary"
        >
          {saving ? '...' : t('saveRecommendations')}
        </button>
        {message && (
          <span className="text-sm text-[var(--accent)]">{message}</span>
        )}
      </div>
    </div>
  );
}

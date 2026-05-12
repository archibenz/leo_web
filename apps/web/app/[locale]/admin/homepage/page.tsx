'use client';

import {useState, useEffect, useCallback} from 'react';
import {useTranslations} from 'next-intl';
import AdminLayout from '../../../../components/admin/AdminLayout';
import BrandLoader from '../../../../components/BrandLoader';
import {apiFetch} from '../../../../lib/api';

type Product = {
  id: string;
  title: string;
  price: number;
  active: boolean;
};

type Collection = {
  id: string;
  name: string;
};

type ConfigMap = Record<string, string>;

const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

export default function AdminHomepagePage() {
  const t = useTranslations('admin');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);

  const [featuredProductIds, setFeaturedProductIds] = useState<string[]>([]);
  const [homepageCollectionIds, setHomepageCollectionIds] = useState<string[]>([]);
  const [season, setSeason] = useState('spring');
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear().toString());

  const [productSearch, setProductSearch] = useState('');
  const [collectionSearch, setCollectionSearch] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [config, prods, cols] = await Promise.all([
        apiFetch<ConfigMap>('/api/admin/config'),
        apiFetch<Product[]>('/api/admin/products'),
        apiFetch<Collection[]>('/api/admin/collections'),
      ]);

      setProducts(prods);
      setCollections(cols);

      if (config.featuredProducts) {
        try { setFeaturedProductIds(JSON.parse(config.featuredProducts)); } catch {}
      }
      if (config.homepageCollections) {
        try { setHomepageCollectionIds(JSON.parse(config.homepageCollections)); } catch {}
      }
      if (config.currentSeason) {
        setSeason(config.currentSeason);
      }
      if (config.currentSeasonYear) {
        setSeasonYear(config.currentSeasonYear);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      await Promise.all([
        apiFetch('/api/admin/config/featuredProducts', {
          method: 'PUT',
          body: JSON.stringify({value: JSON.stringify(featuredProductIds)}),
        }),
        apiFetch('/api/admin/config/homepageCollections', {
          method: 'PUT',
          body: JSON.stringify({value: JSON.stringify(homepageCollectionIds)}),
        }),
        apiFetch('/api/admin/config/currentSeason', {
          method: 'PUT',
          body: JSON.stringify({value: season}),
        }),
        apiFetch('/api/admin/config/currentSeasonYear', {
          method: 'PUT',
          body: JSON.stringify({value: seasonYear}),
        }),
      ]);
      setMessage(t('settingsSaved'));
    } catch {
      setMessage(t('recommendationsError'));
    } finally {
      setSaving(false);
    }
  };

  const toggleFeaturedProduct = (id: string) => {
    setFeaturedProductIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleCollection = (id: string) => {
    setHomepageCollectionIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const filteredProducts = products.filter(p =>
    p.title.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredCollections = collections.filter(c =>
    c.name.toLowerCase().includes(collectionSearch.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display text-[var(--ink)]">{t('homepageSettings')}</h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <BrandLoader size={32} />
          </div>
        ) : (
          <>
            {/* Current Season */}
            <div className="paper-card p-6 space-y-4">
              <h2 className="text-lg font-medium text-[var(--ink)]">{t('currentSeason')}</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-[var(--ink-soft)]">{t('season')}</label>
                  <select
                    value={season}
                    onChange={e => setSeason(e.target.value)}
                    className="admin-input"
                  >
                    {SEASONS.map(s => (
                      <option key={s} value={s}>{t(`seasons.${s}`)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-[var(--ink-soft)]">{t('year')}</label>
                  <input
                    type="number"
                    value={seasonYear}
                    onChange={e => setSeasonYear(e.target.value)}
                    className="admin-input"
                    min={2020}
                    max={2040}
                  />
                </div>
              </div>
            </div>

            {/* Featured Products */}
            <div className="paper-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-[var(--ink)]">{t('featuredProducts')}</h2>
                <span className="text-xs text-[var(--ink-soft)]">
                  {featuredProductIds.length} {t('selected')}
                </span>
              </div>

              {/* Selected tags */}
              {featuredProductIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {featuredProductIds.map(id => {
                    const product = products.find(p => p.id === id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleFeaturedProduct(id)}
                        className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 py-1 text-xs text-[var(--paper-base)] transition hover:opacity-80"
                      >
                        {product?.title || id}
                        <span>&times;</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Search */}
              <input
                type="text"
                placeholder={t('searchProducts')}
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="admin-input"
              />

              {/* Product list */}
              <div className="max-h-60 overflow-y-auto space-y-1">
                {filteredProducts.map(product => (
                  <label
                    key={product.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer hover:bg-[var(--ink)]/5 transition"
                  >
                    <input
                      type="checkbox"
                      checked={featuredProductIds.includes(product.id)}
                      onChange={() => toggleFeaturedProduct(product.id)}
                      className="accent-[var(--accent)] h-4 w-4"
                    />
                    <span className="text-sm text-[var(--ink)]">{product.title}</span>
                    <span className="text-xs text-[var(--ink-soft)]">&euro;{product.price}</span>
                    {!product.active && (
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-400">
                        {t('inactive')}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Homepage Collections */}
            <div className="paper-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-[var(--ink)]">{t('homepageCollections')}</h2>
                <span className="text-xs text-[var(--ink-soft)]">
                  {homepageCollectionIds.length} {t('selected')}
                </span>
              </div>

              {/* Selected tags */}
              {homepageCollectionIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {homepageCollectionIds.map(id => {
                    const col = collections.find(c => c.id === id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleCollection(id)}
                        className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 py-1 text-xs text-[var(--paper-base)] transition hover:opacity-80"
                      >
                        {col?.name || id}
                        <span>&times;</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Search */}
              <input
                type="text"
                placeholder={t('searchCollections')}
                value={collectionSearch}
                onChange={e => setCollectionSearch(e.target.value)}
                className="admin-input"
              />

              {/* Collection list */}
              <div className="max-h-60 overflow-y-auto space-y-1">
                {filteredCollections.map(col => (
                  <label
                    key={col.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer hover:bg-[var(--ink)]/5 transition"
                  >
                    <input
                      type="checkbox"
                      checked={homepageCollectionIds.includes(col.id)}
                      onChange={() => toggleCollection(col.id)}
                      className="accent-[var(--accent)] h-4 w-4"
                    />
                    <span className="text-sm text-[var(--ink)]">{col.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Save */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="lux-btn-primary"
              >
                {saving ? '...' : t('saveSettings')}
              </button>
              {message && (
                <span className="text-sm text-[var(--accent)]">{message}</span>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

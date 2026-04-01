'use client';

import {useState, useEffect} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname, useRouter} from 'next/navigation';
import {apiFetch} from '../../lib/api';
import ImageUpload from './ImageUpload';
import {CARE_SYMBOL_KEYS, CareSymbol} from '../CareSymbols';

type Collection = {
  id: string;
  name: string;
};

interface ProductFormProps {
  productId?: string;
  isNew?: boolean;
}

const CATEGORY_OPTIONS = ['dresses', 'outerwear', 'tailoring', 'knitwear', 'blouses', 'skirts', 'trousers'];
const OCCASION_OPTIONS = ['evening', 'office', 'casual', 'resort', 'ceremony'];
const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL'];

export default function ProductForm({productId, isNew}: ProductFormProps) {
  const t = useTranslations('admin.product');
  const router = useRouter();
  const pathname = usePathname() || '/';
  const locale = pathname.split('/')[1] || 'ru';

  const [collections, setCollections] = useState<Collection[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    id: '',
    title: '',
    description: '',
    price: 0,
    category: '',
    sizes: [] as string[],
    collectionId: '' as string,
    stockQuantity: 0,
    lowStockThreshold: 5,
    occasion: '',
    color: '',
    material: '',
    subtitle: '',
    sku: '',
    active: true,
    images: [] as {src: string; alt: string}[],
    careSymbols: [] as string[],
    careText: '',
  });

  useEffect(() => {
    apiFetch<Collection[]>('/api/admin/collections').then(setCollections).catch(() => {});

    if (productId && !isNew) {
      apiFetch<Record<string, unknown>>(`/api/admin/products/${productId}`).then(data => {
        let imgs: {src: string; alt: string}[] = [];
        if (typeof data.images === 'string') {
          try { imgs = JSON.parse(data.images); } catch {}
        }
        setForm({
          id: (data.id as string) || '',
          title: (data.title as string) || '',
          description: (data.description as string) || '',
          price: (data.price as number) || 0,
          category: (data.category as string) || '',
          sizes: (data.sizes as string[]) || [],
          collectionId: (data.collectionId as string) || '',
          stockQuantity: (data.stockQuantity as number) || 0,
          lowStockThreshold: (data.lowStockThreshold as number) || 5,
          occasion: (data.occasion as string) || '',
          color: (data.color as string) || '',
          material: (data.material as string) || '',
          subtitle: (data.subtitle as string) || '',
          sku: (data.sku as string) || '',
          active: data.active !== false,
          images: imgs,
          careSymbols: (() => {
            if (!data.careInstructions) return [];
            try {
              const ci = typeof data.careInstructions === 'string' ? JSON.parse(data.careInstructions as string) : data.careInstructions;
              return (ci.symbols as string[]) || [];
            } catch { return []; }
          })(),
          careText: (() => {
            if (!data.careInstructions) return '';
            try {
              const ci = typeof data.careInstructions === 'string' ? JSON.parse(data.careInstructions as string) : data.careInstructions;
              return (ci.text as string) || '';
            } catch { return ''; }
          })(),
        });
      }).catch(() => {});
    }
  }, [productId, isNew]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const body = {
      id: form.id,
      title: form.title,
      description: form.description,
      price: form.price,
      category: form.category || null,
      sizes: form.sizes,
      collectionId: form.collectionId || null,
      stockQuantity: form.stockQuantity,
      lowStockThreshold: form.lowStockThreshold,
      occasion: form.occasion || null,
      color: form.color || null,
      material: form.material || null,
      subtitle: form.subtitle || null,
      sku: form.sku || null,
      active: form.active,
      images: JSON.stringify(form.images),
      careInstructions: (form.careSymbols.length > 0 || form.careText)
        ? JSON.stringify({symbols: form.careSymbols, text: form.careText})
        : null,
    };

    try {
      if (isNew) {
        await apiFetch('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setMessage(t('created'));
        setTimeout(() => router.push(`/${locale}/admin/products`), 1000);
      } else {
        await apiFetch(`/api/admin/products/${productId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        setMessage(t('updated'));
      }
    } catch {
      setMessage('Error saving product');
    } finally {
      setSaving(false);
    }
  };

  const toggleSize = (size: string) => {
    setForm(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ID (only for new) */}
      {isNew && (
        <Field label={t('id')} hint={t('idHint')}>
          <input
            value={form.id}
            onChange={e => setForm(prev => ({...prev, id: e.target.value}))}
            className="admin-input"
            required
            placeholder="e.g. silk-evening-gown"
          />
        </Field>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('title')}>
          <input value={form.title} onChange={e => setForm(prev => ({...prev, title: e.target.value}))} className="admin-input" required />
        </Field>
        <Field label={t('subtitle')}>
          <input value={form.subtitle} onChange={e => setForm(prev => ({...prev, subtitle: e.target.value}))} className="admin-input" placeholder="e.g. Evening · Silk" />
        </Field>
      </div>

      <Field label={t('description')}>
        <textarea value={form.description} onChange={e => setForm(prev => ({...prev, description: e.target.value}))} className="admin-input min-h-[80px]" />
      </Field>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label={t('price')}>
          <input type="number" step="0.01" value={form.price} onChange={e => setForm(prev => ({...prev, price: parseFloat(e.target.value) || 0}))} className="admin-input" required />
        </Field>
        <Field label={t('stock')}>
          <input type="number" value={form.stockQuantity} onChange={e => setForm(prev => ({...prev, stockQuantity: parseInt(e.target.value) || 0}))} className="admin-input" />
        </Field>
        <Field label={t('threshold')}>
          <input type="number" value={form.lowStockThreshold} onChange={e => setForm(prev => ({...prev, lowStockThreshold: parseInt(e.target.value) || 5}))} className="admin-input" />
        </Field>
        <Field label={t('sku')}>
          <input value={form.sku} onChange={e => setForm(prev => ({...prev, sku: e.target.value}))} className="admin-input" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label={t('category')}>
          <select value={form.category} onChange={e => setForm(prev => ({...prev, category: e.target.value}))} className="admin-input">
            <option value="">—</option>
            {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label={t('occasion')}>
          <select value={form.occasion} onChange={e => setForm(prev => ({...prev, occasion: e.target.value}))} className="admin-input">
            <option value="">—</option>
            {OCCASION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label={t('color')}>
          <input value={form.color} onChange={e => setForm(prev => ({...prev, color: e.target.value}))} className="admin-input" />
        </Field>
        <Field label={t('material')}>
          <input value={form.material} onChange={e => setForm(prev => ({...prev, material: e.target.value}))} className="admin-input" />
        </Field>
      </div>

      <Field label={t('collection')}>
        <select value={form.collectionId} onChange={e => setForm(prev => ({...prev, collectionId: e.target.value}))} className="admin-input">
          <option value="">—</option>
          {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>

      {/* Sizes */}
      <Field label={t('sizes')}>
        <div className="flex flex-wrap gap-2">
          {SIZE_OPTIONS.map(size => (
            <button
              key={size}
              type="button"
              onClick={() => toggleSize(size)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                form.sizes.includes(size)
                  ? 'bg-[var(--accent)] text-[var(--paper-base)]'
                  : 'bg-[var(--ink)]/5 text-[var(--ink-soft)] hover:bg-[var(--ink)]/10'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </Field>

      {/* Active toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.active}
          onChange={e => setForm(prev => ({...prev, active: e.target.checked}))}
          className="accent-[var(--accent)] h-4 w-4"
        />
        <span className="text-sm text-[var(--ink)]">{t('active')}</span>
      </label>

      {/* Images */}
      <Field label={t('images')}>
        <ImageUpload images={form.images} onChange={images => setForm(prev => ({...prev, images}))} />
      </Field>

      {/* Care instructions */}
      <div className="space-y-3 pt-2 border-t border-[var(--ink)]/10">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--ink-soft)]">
          {locale === 'ru' ? 'Уход за изделием' : 'Care Instructions'}
        </p>
        <div className="grid grid-cols-5 gap-2">
          {CARE_SYMBOL_KEYS.map(key => {
            const selected = form.careSymbols.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setForm(prev => ({
                  ...prev,
                  careSymbols: prev.careSymbols.includes(key)
                    ? prev.careSymbols.filter(s => s !== key)
                    : [...prev.careSymbols, key],
                }))}
                className={`flex flex-col items-center gap-1 rounded-lg p-1.5 border transition ${
                  selected
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--ink)]/10 hover:border-[var(--ink)]/20'
                }`}
              >
                <CareSymbol symbolKey={key} locale={locale} size={24} />
                <span className="text-[8px] text-[var(--ink-soft)] text-center leading-tight">
                  {key.replace(/_/g, ' ')}
                </span>
              </button>
            );
          })}
        </div>
        <textarea
          className="admin-input min-h-[60px]"
          value={form.careText}
          onChange={e => setForm(prev => ({...prev, careText: e.target.value}))}
          placeholder={locale === 'ru' ? 'Текстовое описание ухода' : 'Care description text'}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-[var(--paper-base)] transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? '...' : t('save')}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/${locale}/admin/products`)}
          className="text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] transition"
        >
          {t('cancel')}
        </button>
        {message && (
          <span className="text-sm text-[var(--accent)]">{message}</span>
        )}
      </div>
    </form>
  );
}

function Field({label, hint, children}: {label: string; hint?: string; children: React.ReactNode}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wider text-[var(--ink-soft)]">{label}</label>
      {hint && <p className="text-[10px] text-[var(--ink-soft)]/60">{hint}</p>}
      {children}
    </div>
  );
}

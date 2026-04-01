'use client';

import {useState, useEffect} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname, useRouter} from 'next/navigation';
import {apiFetch} from '../../lib/api';
import ImageUpload from './ImageUpload';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

interface CollectionFormProps {
  collectionId?: string;
  isNew?: boolean;
}

export default function CollectionForm({collectionId, isNew}: CollectionFormProps) {
  const t = useTranslations('admin.collection');
  const router = useRouter();
  const pathname = usePathname() || '/';
  const locale = pathname.split('/')[1] || 'ru';

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    imageUrl: '',
    sortOrder: 0,
  });

  useEffect(() => {
    if (collectionId && !isNew) {
      apiFetch<Record<string, unknown>>(`/api/admin/collections/${collectionId}`).then(data => {
        setForm({
          name: (data.name as string) || '',
          description: (data.description as string) || '',
          imageUrl: (data.imageUrl as string) || '',
          sortOrder: (data.sortOrder as number) || 0,
        });
      }).catch(() => {});
    }
  }, [collectionId, isNew]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      if (isNew) {
        await apiFetch('/api/admin/collections', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        setMessage(t('created'));
        setTimeout(() => router.push(`/${locale}/admin/collections`), 1000);
      } else {
        await apiFetch(`/api/admin/collections/${collectionId}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
        setMessage(t('updated'));
      }
    } catch {
      setMessage('Error saving collection');
    } finally {
      setSaving(false);
    }
  };

  const handleImageChange = (images: {src: string; alt: string}[]) => {
    if (images.length > 0) {
      setForm(prev => ({...prev, imageUrl: images[images.length - 1].src}));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-[var(--ink-soft)]">{t('name')}</label>
        <input
          value={form.name}
          onChange={e => setForm(prev => ({...prev, name: e.target.value}))}
          className="admin-input"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-[var(--ink-soft)]">{t('description')}</label>
        <textarea
          value={form.description}
          onChange={e => setForm(prev => ({...prev, description: e.target.value}))}
          className="admin-input min-h-[80px]"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-[var(--ink-soft)]">{t('sortOrder')}</label>
        <input
          type="number"
          value={form.sortOrder}
          onChange={e => setForm(prev => ({...prev, sortOrder: parseInt(e.target.value) || 0}))}
          className="admin-input w-24"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-[var(--ink-soft)]">{t('image')}</label>
        <ImageUpload
          images={form.imageUrl ? [{src: form.imageUrl, alt: form.name}] : []}
          onChange={handleImageChange}
        />
      </div>

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
          onClick={() => router.push(`/${locale}/admin/collections`)}
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

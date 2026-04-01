'use client';

import {useState} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import AdminLayout from './AdminLayout';
import {apiFetch} from '../../lib/api';
import {CARE_SYMBOL_KEYS, CareSymbol} from '../CareSymbols';

interface CareGuideFormProps {
  initial?: {
    id?: string;
    title: string;
    description: string;
    tips: string;
    image: string;
    careSymbols: string[];
    sortOrder: number;
    active: boolean;
  };
}

export default function CareGuideForm({initial}: CareGuideFormProps) {
  const pathname = usePathname() || '/';
  const locale = pathname.split('/')[1] || 'ru';
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    tips: initial?.tips ?? '',
    image: initial?.image ?? '',
    careSymbols: initial?.careSymbols ?? [] as string[],
    sortOrder: initial?.sortOrder ?? 0,
    active: initial?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const toggleSymbol = (key: string) => {
    setForm(prev => ({
      ...prev,
      careSymbols: prev.careSymbols.includes(key)
        ? prev.careSymbols.filter(s => s !== key)
        : [...prev.careSymbols, key],
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setMessage(locale === 'ru' ? 'Введите название' : 'Title required');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const body = {
        title: form.title,
        description: form.description || null,
        tips: form.tips || null,
        image: form.image || null,
        careSymbols: JSON.stringify(form.careSymbols),
        sortOrder: form.sortOrder,
        active: form.active,
      };
      if (isEdit) {
        await apiFetch(`/api/admin/care-guides/${initial!.id}`, {method: 'PUT', body: JSON.stringify(body), headers: {'Content-Type': 'application/json'}});
      } else {
        await apiFetch('/api/admin/care-guides', {method: 'POST', body: JSON.stringify(body), headers: {'Content-Type': 'application/json'}});
      }
      setMessage(locale === 'ru' ? 'Сохранено!' : 'Saved!');
      setTimeout(() => router.push(`/${locale}/admin/care`), 800);
    } catch {
      setMessage(locale === 'ru' ? 'Ошибка сохранения' : 'Save error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-display text-[var(--ink)]">
          {isEdit
            ? (locale === 'ru' ? 'Редактировать' : 'Edit')
            : (locale === 'ru' ? 'Новая запись по уходу' : 'New Care Guide')}
        </h1>

        <div className="space-y-4">
          <Field label={locale === 'ru' ? 'Название ткани' : 'Fabric name'}>
            <input
              className="admin-input"
              value={form.title}
              onChange={e => setForm(prev => ({...prev, title: e.target.value}))}
              placeholder={locale === 'ru' ? 'Например: Шёлк' : 'e.g. Silk'}
            />
          </Field>

          <Field label={locale === 'ru' ? 'Описание' : 'Description'}>
            <textarea
              className="admin-input min-h-[100px]"
              value={form.description}
              onChange={e => setForm(prev => ({...prev, description: e.target.value}))}
              placeholder={locale === 'ru' ? 'Общее описание ткани и особенности ухода' : 'General fabric description and care overview'}
            />
          </Field>

          <Field label={locale === 'ru' ? 'Советы' : 'Tips'}>
            <textarea
              className="admin-input min-h-[80px]"
              value={form.tips}
              onChange={e => setForm(prev => ({...prev, tips: e.target.value}))}
              placeholder={locale === 'ru' ? 'Практические советы по уходу' : 'Practical care tips'}
            />
          </Field>

          <Field label={locale === 'ru' ? 'Изображение (URL)' : 'Image URL'}>
            <input
              className="admin-input"
              value={form.image}
              onChange={e => setForm(prev => ({...prev, image: e.target.value}))}
              placeholder="https://..."
            />
          </Field>

          <Field label={locale === 'ru' ? 'Символы ухода' : 'Care symbols'}>
            <div className="grid grid-cols-5 gap-3">
              {CARE_SYMBOL_KEYS.map(key => {
                const selected = form.careSymbols.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleSymbol(key)}
                    className={`flex flex-col items-center gap-1 rounded-lg p-2 border transition ${
                      selected
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                        : 'border-[var(--ink)]/10 hover:border-[var(--ink)]/20'
                    }`}
                  >
                    <CareSymbol symbolKey={key} locale={locale} size={28} />
                    <span className="text-[9px] text-[var(--ink-soft)] text-center leading-tight">
                      {key.replace(/_/g, ' ')}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="flex gap-4">
            <Field label={locale === 'ru' ? 'Порядок' : 'Sort order'}>
              <input
                type="number"
                className="admin-input w-24"
                value={form.sortOrder}
                onChange={e => setForm(prev => ({...prev, sortOrder: parseInt(e.target.value) || 0}))}
              />
            </Field>

            <Field label={locale === 'ru' ? 'Активно' : 'Active'}>
              <button
                type="button"
                onClick={() => setForm(prev => ({...prev, active: !prev.active}))}
                className={`mt-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                  form.active
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {form.active ? (locale === 'ru' ? 'Да' : 'Yes') : (locale === 'ru' ? 'Нет' : 'No')}
              </button>
            </Field>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-[var(--accent)] px-8 py-3 text-sm font-medium text-[var(--paper-base)] transition hover:opacity-90 disabled:opacity-50"
          >
            {saving
              ? (locale === 'ru' ? 'Сохранение...' : 'Saving...')
              : (locale === 'ru' ? 'Сохранить' : 'Save')}
          </button>
          {message && (
            <span className={`text-sm ${message.includes('!') ? 'text-green-400' : 'text-red-400'}`}>
              {message}
            </span>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wider text-[var(--ink-soft)]">{label}</label>
      {children}
    </div>
  );
}

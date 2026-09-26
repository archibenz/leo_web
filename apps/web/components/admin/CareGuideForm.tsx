'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname, useRouter} from 'next/navigation';
import {apiFetch} from '../../lib/api';
import {Input} from '../ui/input';
import {Textarea} from '../ui/textarea';
import {Switch} from '../ui/switch';
import {Panel} from './dashboard/panel';
import {FormActions, FormField} from './form/field';
import {CARE_SYMBOL_KEYS, CareSymbol, getSymbolLabel} from '../CareSymbols';

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
  // Подписи этого экрана заданы тернарником по локали, а не словарём — так
  // было и до переезда. Перенос строк в messages это работа про переводы, а
  // не про вид; смешивать их значило бы раздуть диф там, где смотреть нечего.
  const tc = useTranslations('admin.careGuides');

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
      setMessage(tc('errTitleRequired'));
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
      setMessage(tc('saved'));
      setTimeout(() => router.push(`/${locale}/admin/care`), 800);
    } catch {
      setMessage(tc('errSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl *:mb-6 last:*:mb-0 pb-20">
      <h1 className="font-display text-[clamp(24px,2.4vw,32px)] leading-none">
        {isEdit
          ? (tc('edit'))
          : (tc('formNew'))}
      </h1>

      <Panel title={tc('sectionText')}>
        <div className="space-y-6">
          <FormField id="care-title" label={tc('fabricName')}>
            <Input
              className="min-h-11"
              id="care-title"
              onChange={e => setForm(prev => ({...prev, title: e.target.value}))}
              placeholder={tc('fabricNamePlaceholder')}
              value={form.title}
            />
          </FormField>

          <FormField id="care-description" label={tc('description')}>
            <Textarea
              className="min-h-28"
              id="care-description"
              onChange={e => setForm(prev => ({...prev, description: e.target.value}))}
              placeholder={tc('descriptionPlaceholder')}
              value={form.description}
            />
          </FormField>

          <FormField id="care-tips" label={tc('tips')}>
            <Textarea
              className="min-h-24"
              id="care-tips"
              onChange={e => setForm(prev => ({...prev, tips: e.target.value}))}
              placeholder={tc('tipsPlaceholder')}
              value={form.tips}
            />
          </FormField>

          <FormField id="care-image" label={tc('imageUrl')}>
            <Input
              className="min-h-11"
              id="care-image"
              inputMode="url"
              onChange={e => setForm(prev => ({...prev, image: e.target.value}))}
              placeholder="https://..."
              value={form.image}
            />
          </FormField>
        </div>
      </Panel>

      <Panel title={tc('colSymbols')}>
        {/* Значки — не поля ввода, а переключатели с состоянием, и роль у
            них соответствующая. Прежде это были обычные кнопки, и диктор
            не сообщал, выбран символ или нет: разница была только в цвете
            рамки. */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {CARE_SYMBOL_KEYS.map(key => {
            const selected = form.careSymbols.includes(key);
            return (
              <button
                aria-pressed={selected}
                className={`flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-lg border p-2 transition-colors ${
                  selected ? 'border-foreground bg-muted' : 'border-border hover:bg-muted'
                }`}
                key={key}
                onClick={() => toggleSymbol(key)}
                type="button"
              >
                <CareSymbol locale={locale} size={28} symbolKey={key} />
                <span className="text-center text-[9px] leading-tight text-muted-foreground">
                  {getSymbolLabel(key, locale)}
                </span>
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel title={tc('sectionVisibility')}>
        <div className="flex flex-wrap items-end gap-8">
          <FormField id="care-sort" label={tc('sortOrder')}>
            <Input
              className="min-h-11 w-28"
              id="care-sort"
              inputMode="numeric"
              onChange={e => setForm(prev => ({...prev, sortOrder: parseInt(e.target.value) || 0}))}
              type="number"
              value={form.sortOrder}
            />
          </FormField>

          {/* Было двумя словами «Да»/«Нет» на цветной пилюле — по виду
              подпись, а не орган управления. Диктор при этом произносил
              «Да», не сообщая, что это выключатель и что его можно нажать. */}
          <div className="flex min-h-11 items-center gap-3">
            <Switch
              checked={form.active}
              id="care-active"
              onCheckedChange={value => setForm(prev => ({...prev, active: value}))}
            />
            <label className="text-[13px]" htmlFor="care-active">
              {tc('showGuide')}
            </label>
          </div>
        </div>
      </Panel>

      <FormActions
        cancelLabel={tc('cancel')}
        message={message}
        onCancel={() => router.push(`/${locale}/admin/care`)}
        onSave={handleSave}
        saveLabel={tc('save')}
        saving={saving}
        savingLabel={tc('saving')}
      />
    </div>
  );
}

'use client';

import {useState, useEffect} from 'react';
import {useTranslations} from 'next-intl';
import {usePathname, useRouter} from 'next/navigation';
import {apiFetch} from '../../lib/api';
import ImageUpload from './ImageUpload';
import {CARE_SYMBOL_KEYS, CareSymbol} from '../CareSymbols';
import {Input} from '../ui/input';
import {Textarea} from '../ui/textarea';
import {Switch} from '../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {Panel} from './dashboard/panel';
import {Notice} from './list/notice';
import {FormActions, FormField} from './form/field';

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

// Select из shadcn запрещает пустую строку как значение пункта: пустая строка
// у него означает «ничего не выбрано» и ломает сам список. Поэтому «не
// выбрано» получает свою метку, а на границе она превращается обратно в
// пустую строку — договор сохранения от этого не меняется ни на поле.
const NONE = '__none__';

// Число из поля ввода. Прежде здесь стояло `parseInt(value) || 5`, и это
// давало ДВЕ поломки сразу:
//
// 1. Ноль был недостижим. `parseInt('0') || 5` возвращает 5 — владелец ставил
//    порог 0, сохранял, и получал 5, ничего об этом не узнав.
// 2. Очистить и набрать заново было нельзя. Пустая строка давала 5, поле
//    показывало 5, и набранная следом тройка приписывалась к нему: выходило 53.
//
// Запасное значение — это НАЧАЛЬНОЕ значение, и его место в useState, где оно
// и стоит (lowStockThreshold: 5). Подставлять его на каждом нажатии значит
// спорить с тем, что человек набирает.
function числоИзПоля(значение: string): number {
  const n = parseInt(значение, 10);
  return Number.isNaN(n) ? 0 : n;
}

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
          try { imgs = JSON.parse(data.images); } catch { /* malformed JSON — keep empty list */ }
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
    <form className="max-w-4xl *:mb-6 last:*:mb-0 pb-20" onSubmit={handleSubmit}>
      {/* Половина полей этой формы пишется в строку ВАРИАНТА (`products`), а
          витрина берёт имя и описание из МОДЕЛИ (`product_models`) — см.
          StorefrontMapping, где из варианта читаются только price, salePrice,
          colorKey/Hex/Name*, image, images, stockQuantity, active, sortOrder.
          Сохранение при этом проходит, поле записывается, страница не меняется:
          владелец верит, что переименовал товар, и узнаёт обратное через день.
          Поведение не трогаем (поля нужны боту и оповещениям склада) — говорим
          правду словами. Снять подпись можно будет только вместе с выводом
          полей модели в редактор, не раньше. */}
      <Notice>{t('scopeNotice')}</Notice>

      <Panel title={t('title')}>
        <div className="space-y-6">
          {isNew && (
            <FormField hint={t('idHint')} id="product-id" label={t('id')}>
              <Input
                className="min-h-11"
                id="product-id"
                onChange={e => setForm(prev => ({...prev, id: e.target.value}))}
                placeholder="e.g. silk-evening-gown"
                required
                value={form.id}
              />
            </FormField>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField hint={t('notOnSite')} id="product-title" label={t('title')}>
              <Input
                className="min-h-11"
                id="product-title"
                onChange={e => setForm(prev => ({...prev, title: e.target.value}))}
                required
                value={form.title}
              />
            </FormField>
            <FormField hint={t('notOnSite')} id="product-subtitle" label={t('subtitle')}>
              <Input
                className="min-h-11"
                id="product-subtitle"
                onChange={e => setForm(prev => ({...prev, subtitle: e.target.value}))}
                placeholder="e.g. Evening · Silk"
                value={form.subtitle}
              />
            </FormField>
          </div>

          <FormField hint={t('notOnSite')} id="product-description" label={t('description')}>
            <Textarea
              className="min-h-24"
              id="product-description"
              onChange={e => setForm(prev => ({...prev, description: e.target.value}))}
              value={form.description}
            />
          </FormField>
        </div>
      </Panel>

      <Panel title={t('price')}>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FormField id="product-price" label={t('price')}>
            <Input
              className="min-h-11"
              id="product-price"
              inputMode="decimal"
              onChange={e => setForm(prev => ({...prev, price: parseFloat(e.target.value) || 0}))}
              required
              step="0.01"
              type="number"
              value={form.price}
            />
          </FormField>
          <FormField id="product-stock" label={t('stock')}>
            <Input
              className="min-h-11"
              id="product-stock"
              inputMode="numeric"
              onChange={e => setForm(prev => ({...prev, stockQuantity: parseInt(e.target.value) || 0}))}
              type="number"
              value={form.stockQuantity}
            />
          </FormField>
          <FormField id="product-threshold" label={t('threshold')}>
            <Input
              className="min-h-11"
              id="product-threshold"
              inputMode="numeric"
              onChange={e => setForm(prev => ({...prev, lowStockThreshold: числоИзПоля(e.target.value)}))}
              type="number"
              value={form.lowStockThreshold}
            />
          </FormField>
          <FormField id="product-sku" label={t('sku')}>
            <Input
              className="min-h-11"
              id="product-sku"
              onChange={e => setForm(prev => ({...prev, sku: e.target.value}))}
              value={form.sku}
            />
          </FormField>
        </div>
      </Panel>

      <Panel title={t('category')}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField id="product-category" label={t('category')}>
              <Select
                onValueChange={value => setForm(prev => ({...prev, category: value === NONE ? '' : value}))}
                value={form.category || NONE}
              >
                <SelectTrigger className="min-h-11" id="product-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t('notChosen')}</SelectItem>
                  {CATEGORY_OPTIONS.map(option => (
                    <SelectItem key={option} value={option}>{t(`categories.${option}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="product-occasion" label={t('occasion')}>
              <Select
                onValueChange={value => setForm(prev => ({...prev, occasion: value === NONE ? '' : value}))}
                value={form.occasion || NONE}
              >
                <SelectTrigger className="min-h-11" id="product-occasion">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t('notChosen')}</SelectItem>
                  {OCCASION_OPTIONS.map(option => (
                    <SelectItem key={option} value={option}>{t(`occasions.${option}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="product-color" label={t('color')}>
              <Input
                className="min-h-11"
                id="product-color"
                onChange={e => setForm(prev => ({...prev, color: e.target.value}))}
                value={form.color}
              />
            </FormField>
            <FormField id="product-material" label={t('material')}>
              <Input
                className="min-h-11"
                id="product-material"
                onChange={e => setForm(prev => ({...prev, material: e.target.value}))}
                value={form.material}
              />
            </FormField>
          </div>

          <FormField id="product-collection" label={t('collection')}>
            <Select
              onValueChange={value => setForm(prev => ({...prev, collectionId: value === NONE ? '' : value}))}
              value={form.collectionId || NONE}
            >
              <SelectTrigger className="min-h-11" id="product-collection">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t('noCollection')}</SelectItem>
                {collections.map(collection => (
                  <SelectItem key={collection.id} value={collection.id}>{collection.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* Размеры — переключатели с состоянием, а не кнопки: прежде выбор
              отличался только цветом, и диктор о нём не сообщал. */}
          <FormField id="product-sizes" label={t('sizes')}>
            <div className="flex flex-wrap gap-2" id="product-sizes">
              {SIZE_OPTIONS.map(size => (
                <button
                  aria-pressed={form.sizes.includes(size)}
                  className={`min-h-11 min-w-11 rounded-md border px-4 text-[13px] transition-colors ${
                    form.sizes.includes(size)
                      ? 'border-foreground bg-primary text-primary-foreground'
                      : 'border-border hover:bg-muted'
                  }`}
                  key={size}
                  onClick={() => toggleSize(size)}
                  type="button"
                >
                  {size}
                </button>
              ))}
            </div>
          </FormField>

          <div className="flex min-h-11 items-center gap-3">
            <Switch
              checked={form.active}
              id="product-active"
              onCheckedChange={value => setForm(prev => ({...prev, active: value}))}
            />
            <label className="text-[13px]" htmlFor="product-active">{t('active')}</label>
          </div>
        </div>
      </Panel>

      <Panel title={t('images')}>
        <ImageUpload images={form.images} onChange={images => setForm(prev => ({...prev, images}))} />
      </Panel>

      <Panel title={locale === 'ru' ? 'Уход за изделием' : 'Care Instructions'}>
        <div className="space-y-5">
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
                  onClick={() => setForm(prev => ({
                    ...prev,
                    careSymbols: prev.careSymbols.includes(key)
                      ? prev.careSymbols.filter(s => s !== key)
                      : [...prev.careSymbols, key],
                  }))}
                  type="button"
                >
                  <CareSymbol locale={locale} size={24} symbolKey={key} />
                  <span className="text-center text-[8px] leading-tight text-muted-foreground">
                    {key.replace(/_/g, ' ')}
                  </span>
                </button>
              );
            })}
          </div>
          <FormField id="product-care-text" label={locale === 'ru' ? 'Описание ухода' : 'Care description'}>
            <Textarea
              className="min-h-20"
              id="product-care-text"
              onChange={e => setForm(prev => ({...prev, careText: e.target.value}))}
              placeholder={locale === 'ru' ? 'Текстовое описание ухода' : 'Care description text'}
              value={form.careText}
            />
          </FormField>
        </div>
      </Panel>

      <FormActions
        cancelLabel={t('cancel')}
        message={message}
        onCancel={() => router.push(`/${locale}/admin/products`)}
        saveLabel={t('save')}
        saving={saving}
        savingLabel={t('saving')}
      />
    </form>
  );
}

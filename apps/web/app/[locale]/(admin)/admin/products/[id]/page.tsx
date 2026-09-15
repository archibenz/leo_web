'use client';

import {use, useState, useEffect, useCallback} from 'react';
import {useTranslations, useLocale} from 'next-intl';
import ProductForm from '../../../../../../components/admin/ProductForm';
import BrandLoader from '../../../../../../components/BrandLoader';
import {apiFetch} from '../../../../../../lib/api';
import {formatPrice} from '../../../../../../lib/formatPrice';
import {PlusIcon, XIcon} from 'lucide-react';
import {Button} from '../../../../../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../../../components/ui/select';
import {Panel, PanelEmpty} from '../../../../../../components/admin/dashboard/panel';

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
    <div className="max-w-4xl *:mb-6 last:*:mb-0">
      <h1 className="font-display text-[clamp(24px,2.4vw,32px)] leading-none">{t('edit')}</h1>
      <ProductForm productId={id} />
      <RecommendationsSection productId={id} />
    </div>
  );
}

function RecommendationsSection({productId}: {productId: string}) {
  const t = useTranslations('admin');
  const locale = useLocale();
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
    } catch (err) {
      console.error('[AdminProduct] load failed', err);
    }
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
      <Panel title={t('recommendations')}>
        <div className="flex items-center justify-center py-10">
          <BrandLoader size={32} />
        </div>
      </Panel>
    );
  }

  return (
    <Panel title={t('recommendations')}>
      <div className="space-y-5">
        {recommendations.length === 0 ? (
          <PanelEmpty>{t('noRecommendations')}</PanelEmpty>
        ) : (
          <ul className="divide-y rounded-lg ring-1 ring-border">
            {recommendations.map(rec => (
              <li className="flex items-center justify-between gap-4 px-4 py-2" key={rec.id}>
                <span className="min-w-0 truncate text-[13px]">
                  {rec.title}
                  <span className="ml-2 text-muted-foreground text-[12px] tabular-nums">
                    {formatPrice(locale, rec.price)}
                  </span>
                </span>
                {/* 44px: владелец убирает рекомендации пальцем, а прежняя
                    кнопка была 14 пикселей значка в кружке. */}
                <Button
                  aria-label={t('remove')}
                  className="size-11 shrink-0"
                  onClick={() => handleRemove(rec.id)}
                  size="icon"
                  variant="ghost"
                >
                  <XIcon />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Select onValueChange={setSelectedId} value={selectedId}>
            <SelectTrigger aria-label={t('selectProduct')} className="min-h-11 flex-1">
              <SelectValue placeholder={t('selectProduct')} />
            </SelectTrigger>
            <SelectContent>
              {availableProducts.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="min-h-11" disabled={!selectedId} onClick={handleAdd} type="button">
            <PlusIcon />
            {t('addRecommendation')}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Button className="min-h-11" disabled={saving} onClick={handleSave}>
            {saving ? t('saving') : t('saveRecommendations')}
          </Button>
          {message && <span className="text-muted-foreground text-[13px]">{message}</span>}
        </div>
      </div>
    </Panel>
  );
}

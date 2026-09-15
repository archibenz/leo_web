'use client';

import {useState, useEffect, useCallback} from 'react';
import {useTranslations, useLocale} from 'next-intl';
import {SearchIcon, XIcon} from 'lucide-react';
import AdminLayout from '../../../../../components/admin/AdminLayout';
import BrandLoader from '../../../../../components/BrandLoader';
import {apiFetch} from '../../../../../lib/api';
import {formatPrice} from '../../../../../lib/formatPrice';
import {Badge} from '../../../../../components/ui/badge';
import {Button} from '../../../../../components/ui/button';
import {Checkbox} from '../../../../../components/ui/checkbox';
import {Input} from '../../../../../components/ui/input';
import {InputGroup, InputGroupAddon, InputGroupInput} from '../../../../../components/ui/input-group';
import {Label} from '../../../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../../components/ui/select';
import {Panel, PanelEmpty} from '../../../../../components/admin/dashboard/panel';

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
  const locale = useLocale();
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
        try { setFeaturedProductIds(JSON.parse(config.featuredProducts)); } catch { /* malformed JSON — keep default */ }
      }
      if (config.homepageCollections) {
        try { setHomepageCollectionIds(JSON.parse(config.homepageCollections)); } catch { /* malformed JSON — keep default */ }
      }
      if (config.currentSeason) {
        setSeason(config.currentSeason);
      }
      if (config.currentSeasonYear) {
        setSeasonYear(config.currentSeasonYear);
      }
    } catch (err) {
      console.error('[AdminHomepage] load failed', err);
    }
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
      <div className="*:mb-6 last:*:mb-0 pb-20">
        <h1 className="font-display text-[clamp(24px,2.4vw,32px)] leading-none">
          {t('homepageSettings')}
        </h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <BrandLoader size={32} />
          </div>
        ) : (
          <>
            <Panel title={t('currentSeason')}>
              <div className="grid max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="season">{t('season')}</Label>
                  {/* Раньше это был родной <select> с классом admin-input.
                      Родной список на телефоне открывается системным колесом,
                      которое не подчиняется нашей палитре; Select из shadcn
                      рисует свой и потому выглядит одинаково везде. Значения
                      и обработчик те же. */}
                  <Select onValueChange={setSeason} value={season}>
                    <SelectTrigger className="min-h-11" id="season">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEASONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {t(`seasons.${s}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="season-year">{t('year')}</Label>
                  <Input
                    className="min-h-11"
                    id="season-year"
                    inputMode="numeric"
                    onChange={(e) => setSeasonYear(e.target.value)}
                    value={seasonYear}
                  />
                </div>
              </div>
            </Panel>

            <Panel
              action={
                <span className="text-muted-foreground text-[12px] tabular-nums">
                  {featuredProductIds.length} {t('selected')}
                </span>
              }
              title={t('featuredProducts')}
            >
              <div className="space-y-4">
                {featuredProductIds.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {featuredProductIds.map((id) => {
                      const product = products.find((p) => p.id === id);
                      return (
                        // Выбранное снимается нажатием на сам ярлык. Зона
                        // нажатия 44px: владелец снимает их пальцем, а
                        // прежний ярлык был 24px высотой.
                        <button
                          className="inline-flex min-h-11 items-center"
                          key={id}
                          onClick={() => toggleFeaturedProduct(id)}
                          type="button"
                        >
                          <Badge className="gap-1.5" variant="secondary">
                            {product?.title || id}
                            <XIcon className="size-3.5" />
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                )}

                <InputGroup>
                  <InputGroupAddon>
                    <SearchIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder={t('searchProducts')}
                    value={productSearch}
                  />
                </InputGroup>

                {filteredProducts.length === 0 ? (
                  <PanelEmpty>{t('nothingFound')}</PanelEmpty>
                ) : (
                  <ul className="max-h-72 divide-y overflow-y-auto rounded-md ring-1 ring-border">
                    {filteredProducts.map((product) => (
                      <li key={product.id}>
                        <label className="flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-muted">
                          <Checkbox
                            checked={featuredProductIds.includes(product.id)}
                            onCheckedChange={() => toggleFeaturedProduct(product.id)}
                          />
                          <span className="min-w-0 flex-1 truncate text-[13px]">{product.title}</span>
                          <span className="shrink-0 text-muted-foreground text-[12px] tabular-nums">
                            {formatPrice(locale, product.price)}
                          </span>
                          {!product.active && (
                            <Badge className="shrink-0" variant="destructive">
                              {t('inactive')}
                            </Badge>
                          )}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Panel>

            <Panel
              action={
                <span className="text-muted-foreground text-[12px] tabular-nums">
                  {homepageCollectionIds.length} {t('selected')}
                </span>
              }
              title={t('homepageCollections')}
            >
              <div className="space-y-4">
                {homepageCollectionIds.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {homepageCollectionIds.map((id) => {
                      const col = collections.find((c) => c.id === id);
                      return (
                        <button
                          className="inline-flex min-h-11 items-center"
                          key={id}
                          onClick={() => toggleCollection(id)}
                          type="button"
                        >
                          <Badge className="gap-1.5" variant="secondary">
                            {col?.name || id}
                            <XIcon className="size-3.5" />
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                )}

                <InputGroup>
                  <InputGroupAddon>
                    <SearchIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    onChange={(e) => setCollectionSearch(e.target.value)}
                    placeholder={t('searchCollections')}
                    value={collectionSearch}
                  />
                </InputGroup>

                {filteredCollections.length === 0 ? (
                  <PanelEmpty>{t('nothingFound')}</PanelEmpty>
                ) : (
                  <ul className="max-h-72 divide-y overflow-y-auto rounded-md ring-1 ring-border">
                    {filteredCollections.map((col) => (
                      <li key={col.id}>
                        <label className="flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-muted">
                          <Checkbox
                            checked={homepageCollectionIds.includes(col.id)}
                            onCheckedChange={() => toggleCollection(col.id)}
                          />
                          <span className="min-w-0 flex-1 truncate text-[13px]">{col.name}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Panel>
          </>
        )}
      </div>

      {/* Кнопка сохранения прилипает к низу полотна. Прежде она стояла под
          двумя списками по два десятка строк каждый, и на телефоне владелец
          доходил до неё прокруткой через весь экран — а если не доходил,
          правка пропадала. Это то самое «нормальное расположение кнопок»,
          о котором он написал про страницу аккаунта.
          Вне ветки загрузки её нет нарочно: сохранять нечего, пока не
          загрузилось. */}
      {!loading && (
        <div className="-mx-4 sticky bottom-0 flex items-center justify-end gap-4 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
          {message && <span className="text-muted-foreground text-[13px]">{message}</span>}
          <Button className="min-h-11" disabled={saving} onClick={handleSave}>
            {saving ? t('saving') : t('saveSettings')}
          </Button>
        </div>
      )}
    </AdminLayout>
  );
}

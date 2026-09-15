'use client';

import {useEffect, useState} from 'react';
import {apiFetch} from '../../lib/api';
import {MUTED, SIGNAL} from '../../app/[locale]/wv-palette';
import {EditorButton, EditorLabel, NumberField, PercentField, SelectField} from './EditorFields';
import GalleryField from './GalleryField';
import {saveVariantDraft, type Patch} from './editorApi';

// Цена, скидка, наличие и галерея цветового варианта.
//
// Наличие приходится читать отдельной ручкой: stock_quantity в публичном
// ответе витрины нет и быть не должно, а поле обязано открываться с текущим
// значением. Ручка отдаёт карточку с уже наложенным черновиком — тем же
// слиянием, которым будет публиковать.
//
// Скидка — процентом, не суммой в рублях (этап 3а, task-price-ui-brief.md):
// этап 2 уже отучил витрину читать products.sale_price (см.
// VariantPriceCalculator на бэкенде), а это поле раньше писало ровно туда.
// Останься здесь старое поле — владелец правил бы скидку там, где привык,
// сохранение проходило бы, а витрина не менялась: ровно lw-fbpw, который уже
// чинили 14.09 у формы товара, только на этот раз — на странице, которую он
// сам назвал приоритетом. priceSource/discountPct и флаги ниже — то же поле
// ответа StorefrontVariantRequest, что уже отдаёт бэкенд; salePrice в ответе
// остался (это посчитанная действующая цена для превью), но патчем больше не
// уходит — сумму скидки покупателю считает калькулятор на сервере.
type PriceSource = 'manual' | 'ozon';

type VariantDto = {
  price: number | null;
  image: string;
  gallery: string[];
  stockQuantity: number;
  priceSource: PriceSource;
  discountPct: number;
  // Только для чтения — калькулятор считает их заново на каждый GET, патчем
  // они не уходят (см. patchOf: ни один из четырёх сюда не попадает).
  sourceMissing: boolean;
  costUnknown: boolean;
  thresholdApplied: boolean;
  manualPriceInactive: boolean;
};

type ModelDto = {variants: Record<string, VariantDto>};

type Draft = {
  price: number | null;
  priceSource: PriceSource;
  discountPct: number;
  stockQuantity: number | null;
  image: string;
  gallery: string[];
};

// Флаги — не часть черновика: правка их не трогает, это чужой, всегда свежий
// вывод VariantPriceCalculator. Отдельное состояние, а не поля Draft — иначе
// patchOf пришлось бы явно исключать каждый из четырёх, и однажды кто-то забыл
// бы это сделать для нового флага.
type Flags = {
  sourceMissing: boolean;
  costUnknown: boolean;
  thresholdApplied: boolean;
  manualPriceInactive: boolean;
};

const PRICE_SOURCE_OPTIONS: {value: PriceSource; label: string}[] = [
  {value: 'manual', label: 'Своя цена'},
  {value: 'ozon', label: 'Цена с Ozon'},
];
// wildberries сюда нарочно не входит: цена WB в приходящих данных завышена
// втрое-впятеро против уплаченной покупателем, и пока это не исправлено,
// самой возможности выбрать её в переключателе быть не должно (см. brief).

// Целое 0…90 — потолок не деловое правило, а сторож от опечатки: сто
// процентов значит цену ноль, и это почти наверняка промах по клавише.
function discountPctError(value: number): string | null {
  if (!Number.isInteger(value)) return 'Скидка — целое число.';
  if (value < 0 || value > 90) return 'От 0 до 90 — сотня означает цену ноль, это почти наверняка опечатка.';
  return null;
}

function patchOf(before: Draft, now: Draft): Patch {
  const patch: Patch = {};
  if (before.price !== now.price) patch.price = now.price;
  if (before.priceSource !== now.priceSource) patch.priceSource = now.priceSource;
  if (before.discountPct !== now.discountPct) patch.discountPct = now.discountPct;
  if (before.stockQuantity !== now.stockQuantity) patch.stockQuantity = now.stockQuantity ?? 0;
  if (before.image !== now.image) patch.image = now.image;
  if (before.gallery.join('|') !== now.gallery.join('|')) patch.gallery = now.gallery;
  return patch;
}

export default function VariantForm({modelId, variantId, onSaved}: {
  modelId: string;
  variantId: string;
  onSaved: () => void;
}) {
  const [before, setBefore] = useState<Draft | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [flags, setFlags] = useState<Flags | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    // Переключение на другой вариант без закрытия панели (клик по другому
    // свотчу) не размонтирует VariantForm — меняются только props. Черновик
    // сбрасываем СРАЗУ, а не ждём ответа сети: иначе GalleryField, ключом
    // на variantId, перемонтировался бы РАНЬШЕ, чем придут новые image/gallery,
    // и получил бы в качестве «начального» состояния ещё старые, чужие кадры.
    setBefore(null);
    setDraft(null);
    setFlags(null);
    apiFetch<ModelDto>(`/api/admin/storefront/models/${modelId}`)
      .then((model) => {
        const v = model.variants[variantId];
        if (!alive) return;
        if (!v) {
          setError('этого варианта нет в карточке');
          return;
        }
        const loaded: Draft = {
          price: v.price ?? null,
          priceSource: v.priceSource ?? 'manual',
          discountPct: v.discountPct ?? 0,
          stockQuantity: v.stockQuantity ?? 0,
          image: v.image,
          gallery: v.gallery ?? [],
        };
        setBefore(loaded);
        setDraft(loaded);
        setFlags({
          sourceMissing: v.sourceMissing ?? false,
          costUnknown: v.costUnknown ?? false,
          thresholdApplied: v.thresholdApplied ?? false,
          manualPriceInactive: v.manualPriceInactive ?? false,
        });
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'не прочиталось'));
    return () => {
      alive = false;
    };
  }, [modelId, variantId]);

  if (error && !draft) {
    return (
      <p role="alert" className="text-[12px] leading-snug" style={{color: SIGNAL}}>
        {error}
      </p>
    );
  }
  if (!draft || !before) {
    return (
      <p className="text-[12px]" style={{color: MUTED}}>
        читаю карточку…
      </p>
    );
  }

  const patch = patchOf(before, draft);
  const dirty = Object.keys(patch).length > 0;
  const set = <K extends keyof Draft>(key: K) => (value: Draft[K]) => setDraft((d) => (d ? {...d, [key]: value} : d));
  const discountError = discountPctError(draft.discountPct);
  // Поднят ДО того, как флаги успели прийти (flags===null, первая отрисовка
  // после сброса) — поле остаётся активным на этот кадр-два, не заблокированным
  // "на всякий случай": врать о состоянии, которого ещё не знаем, хуже.
  const priceDisabled = flags?.manualPriceInactive ?? false;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await saveVariantDraft(variantId, patch);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'не сохранилось');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SelectField
        label="Источник цены"
        value={draft.priceSource}
        onChange={(next) => set('priceSource')(next as PriceSource)}
        options={PRICE_SOURCE_OPTIONS}
        hint="«Цена с Ozon» приходит с площадки сама; ручную цену ниже в этом режиме не редактируют."
      />
      {flags?.sourceMissing && (
        <p className="text-[12px] leading-snug" style={{color: MUTED}}>
          Цена с Ozon ещё не приходила — показана своя
        </p>
      )}
      <NumberField
        label="Цена, ₽"
        value={draft.price}
        onChange={set('price')}
        disabled={priceDisabled}
        hint={
          priceDisabled
            ? 'Не действует, пока источник — Ozon: витрина смотрит не сюда.'
            : 'Пусто — предзаказ: витрина скажет «Предзаказ» и не даст положить в корзину.'
        }
      />
      <PercentField
        label="Скидка, %"
        value={draft.discountPct}
        onChange={set('discountPct')}
        error={discountError ?? undefined}
        hint="0 — скидки нет. Потолок 90 — сторож от опечатки: сто процентов значит цену ноль."
      />
      {flags?.costUnknown && (
        <p className="text-[12px] leading-snug" style={{color: MUTED}}>
          Себестоимость неизвестна — порог не действует
        </p>
      )}
      {flags?.thresholdApplied && (
        <p className="text-[12px] leading-snug" style={{color: MUTED}}>
          Скидка уменьшена: ниже себестоимости продавать нельзя
        </p>
      )}
      <NumberField label="Наличие, шт" value={draft.stockQuantity} onChange={set('stockQuantity')} />
      <div>
        <EditorLabel>Галерея</EditorLabel>
        {/* key=variantId: при переключении на другой цвет без закрытия панели
            GalleryField обязан начать с чистого состояния — иначе на экране
            повисла бы галерея прошлого варианта, пока не прилетит сеть. */}
        <GalleryField
          key={variantId}
          image={draft.image}
          gallery={draft.gallery}
          onChange={(next) => setDraft((d) => (d ? {...d, image: next.image, gallery: next.gallery} : d))}
          onUploadingChange={setUploading}
        />
      </div>
      {error && (
        <p role="alert" className="text-[12px] leading-snug" style={{color: SIGNAL}}>
          {error}
        </p>
      )}
      {uploading && (
        <p className="text-[12px] leading-snug" style={{color: MUTED}}>
          Дождитесь загрузки кадров — сохранение начнётся, как только все долетят.
        </p>
      )}
      <EditorButton tone="solid" onClick={() => void save()} disabled={!dirty || busy || uploading || discountError !== null}>
        {busy ? 'сохраняю…' : 'Сохранить в черновик'}
      </EditorButton>
    </div>
  );
}

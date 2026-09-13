'use client';

import {useEffect, useState} from 'react';
import {apiFetch} from '../../lib/api';
import {MUTED, SIGNAL} from '../../app/[locale]/wv-palette';
import {EditorButton, EditorLabel, NumberField} from './EditorFields';
import GalleryField from './GalleryField';
import {saveVariantDraft, type Patch} from './editorApi';

// Цена, скидка, наличие и галерея цветового варианта.
//
// Наличие приходится читать отдельной ручкой: stock_quantity в публичном
// ответе витрины нет и быть не должно, а поле обязано открываться с текущим
// значением. Ручка отдаёт карточку с уже наложенным черновиком — тем же
// слиянием, которым будет публиковать.

type VariantDto = {
  price: number | null;
  salePrice: number | null;
  image: string;
  gallery: string[];
  stockQuantity: number;
};

type ModelDto = {variants: Record<string, VariantDto>};

type Draft = {price: number | null; salePrice: number | null; stockQuantity: number | null; image: string; gallery: string[]};

function patchOf(before: Draft, now: Draft): Patch {
  const patch: Patch = {};
  if (before.price !== now.price) patch.price = now.price;
  if (before.salePrice !== now.salePrice) patch.salePrice = now.salePrice;
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
          salePrice: v.salePrice ?? null,
          stockQuantity: v.stockQuantity ?? 0,
          image: v.image,
          gallery: v.gallery ?? [],
        };
        setBefore(loaded);
        setDraft(loaded);
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
      <NumberField
        label="Цена, ₽"
        value={draft.price}
        onChange={set('price')}
        hint="Пусто — предзаказ: витрина скажет «Предзаказ» и не даст положить в корзину."
      />
      <NumberField label="Цена со скидкой, ₽" value={draft.salePrice} onChange={set('salePrice')} hint="Только вместе с ценой и ниже неё." />
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
      <EditorButton tone="solid" onClick={() => void save()} disabled={!dirty || busy || uploading}>
        {busy ? 'сохраняю…' : 'Сохранить в черновик'}
      </EditorButton>
    </div>
  );
}

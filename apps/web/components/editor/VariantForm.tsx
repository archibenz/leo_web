'use client';

import {useEffect, useState} from 'react';
import {apiFetch} from '../../lib/api';
import {HAIR, MUTED, SIGNAL} from '../../app/[locale]/wv-palette';
import {EditorButton, EditorLabel, MediaField, NumberField} from './EditorFields';
import {saveVariantDraft, uploadMedia, type Patch} from './editorApi';

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
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

  async function addToGallery(file: File | undefined) {
    if (!file || !draft) return;
    setBusy(true);
    setError(null);
    try {
      const url = await uploadMedia(file, 'image');
      setDraft({...draft, gallery: [...draft.gallery, url]});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'не загрузилось');
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
      <MediaField label="Главный снимок" value={draft.image} kind="image" onChange={(next) => set('image')(next ?? '')} />
      <div>
        <EditorLabel>Галерея</EditorLabel>
        <ul className="mb-2 flex flex-col gap-1">
          {draft.gallery.map((src, i) => (
            <li key={src} className="flex items-center justify-between gap-2 py-1" style={{borderBottom: `1px solid ${HAIR}`}}>
              <span className="break-all text-[11px]">{src}</span>
              <EditorButton tone="quiet" onClick={() => set('gallery')(draft.gallery.filter((_, j) => j !== i))}>
                убрать
              </EditorButton>
            </li>
          ))}
          {draft.gallery.length === 0 && (
            <li className="text-[12px]" style={{color: MUTED}}>
              пусто — покажем главный снимок
            </li>
          )}
        </ul>
        <label className="inline-flex cursor-pointer items-center px-3 py-2 text-[11px] uppercase tracking-[0.16em]" style={{border: `1px solid ${HAIR}`, color: MUTED}}>
          Добавить кадр
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void addToGallery(e.target.files?.[0])}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-[12px] leading-snug" style={{color: SIGNAL}}>
          {error}
        </p>
      )}
      <EditorButton tone="solid" onClick={() => void save()} disabled={!dirty || busy}>
        {busy ? 'сохраняю…' : 'Сохранить в черновик'}
      </EditorButton>
    </div>
  );
}

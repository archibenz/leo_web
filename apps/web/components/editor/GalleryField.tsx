'use client';

import {useEffect, useRef, useState, type DragEvent} from 'react';
import {HAIR, INK, MUTED, SIGNAL} from '../../app/[locale]/wv-palette';
import {EditorButton, MediaThumb} from './EditorFields';
import {uploadMedia} from './editorApi';
import {appendItems, fromItems, markCover, removeItem, reorderTo, toItems, type GalleryItem} from './galleryOrdering';

type PendingUpload = {id: string; file: File; status: 'pending' | 'error'; error?: string};

// Обложка и галерея варианта — ОДИН список кадров на экране, не два поля.
// «Первый в списке = обложка» ломается при любой перестановке (см.
// task-admin-media-brief.md), поэтому обложка — явный флаг на кадре
// (galleryOrdering.ts), а не позиция.
//
// Список живёт в СОБСТВЕННОМ состоянии компонента, инициализированном из
// props один раз, а не читается из image/gallery заново на каждый рендер:
// если пачка из нескольких файлов отвечает почти одновременно, обновления
// через setItems(prev => …) видят действительно последнее состояние, а не
// то, что было на момент клика «загрузить» — иначе кадр, пришедший первым,
// мог бы потеряться под тем, что пришёл следом. Из-за этого же родитель
// обязан монтировать компонент заново (`key={variantId}`), когда меняется
// сам вариант — иначе после переключения на другой цвет тут ещё висела бы
// чужая галерея.
export default function GalleryField({image, gallery, onChange, onUploadingChange}: {
  image: string;
  gallery: string[];
  onChange: (next: {image: string; gallery: string[]}) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const [items, setItems] = useState<GalleryItem[]>(() => toItems(image, gallery));
  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const nextUploadId = useRef(0);

  // onChange/onUploadingChange не мемоизированы у вызывающей стороны
  // (пересоздаются каждый рендер VariantForm) — рефы дают всегда свежий
  // колбэк без необходимости перезапускать эффект на каждый чих.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onUploadingChangeRef = useRef(onUploadingChange);
  onUploadingChangeRef.current = onUploadingChange;
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return; // на монтировании сохранять нечего — это то же самое, что уже пришло
    }
    onChangeRef.current(fromItems(items));
  }, [items]);

  useEffect(() => {
    onUploadingChangeRef.current?.(uploads.some((u) => u.status === 'pending'));
  }, [uploads]);

  function run(id: string, file: File) {
    uploadMedia(file, 'image')
      .then((url) => {
        setItems((prev) => appendItems(prev, [url]));
        setUploads((prev) => prev.filter((u) => u.id !== id));
      })
      .catch((e: unknown) => {
        // Текст отказа приходит с бэкенда — здесь его не пересказываем.
        setUploads((prev) =>
          prev.map((u) => (u.id === id ? {...u, status: 'error' as const, error: e instanceof Error ? e.message : 'не загрузилось'} : u)),
        );
      });
  }

  function addFiles(files: FileList | File[] | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      const id = String(nextUploadId.current++);
      setUploads((prev) => [...prev, {id, file, status: 'pending'}]);
      run(id, file);
    }
  }

  function retry(u: PendingUpload) {
    setUploads((prev) => prev.map((x) => (x.id === u.id ? {...x, status: 'pending' as const, error: undefined} : x)));
    run(u.id, u.file);
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }

  function onItemDrop(e: DragEvent<HTMLLIElement>, index: number) {
    e.preventDefault();
    if (dragIndex !== null) setItems((prev) => reorderTo(prev, dragIndex, index));
    setDragIndex(null);
  }

  return (
    <div>
      <ul className="flex flex-col gap-2">
        {items.map((item, index) => (
          <li
            key={item.url}
            className="flex flex-col gap-2 py-2"
            style={{borderBottom: `1px solid ${HAIR}`}}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onItemDrop(e, index)}
          >
            {/* Кадр и подпись — своя строка, действия — под ней и переносятся
                (flex-wrap). Миниатюра + адрес + четыре кнопки в один ряд не
                помещаются даже на 360px панели — эту раскладку сломал именно
                настоящий Chromium: jsdom её не считает и юнит-тест не поймал. */}
            <div className="flex items-center gap-3">
              <MediaThumb src={item.url} kind="image" alt={`Кадр ${index + 1}`} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {/* Свой title тут не нужен — он уже есть у обёртки MediaThumb;
                    дублирующий title на этом <p> раньше давал два элемента с
                    одинаковым title в DOM и ломал getByTitle в e2e. */}
                <p className="truncate text-[10px] leading-snug" style={{color: MUTED}}>
                  {item.url}
                </p>
                {item.cover ? (
                  <span className="text-[11px] uppercase tracking-[0.14em]" style={{color: INK}}>
                    Обложка
                  </span>
                ) : (
                  <EditorButton tone="quiet" onClick={() => setItems((prev) => markCover(prev, item.url))}>
                    Сделать обложкой · кадр {index + 1}
                  </EditorButton>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <EditorButton
                onClick={() => setItems((prev) => reorderTo(prev, index, index - 1))}
                disabled={index === 0}
              >
                Вверх · кадр {index + 1}
              </EditorButton>
              <EditorButton
                onClick={() => setItems((prev) => reorderTo(prev, index, index + 1))}
                disabled={index === items.length - 1}
              >
                Вниз · кадр {index + 1}
              </EditorButton>
              <EditorButton
                tone="quiet"
                onClick={() => setItems((prev) => removeItem(prev, item.url))}
                disabled={items.length <= 1}
              >
                Убрать · кадр {index + 1}
              </EditorButton>
            </div>
          </li>
        ))}
      </ul>

      {uploads.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {uploads.map((u) => (
            <li key={u.id} className="flex items-center gap-3 py-2" style={{borderBottom: `1px solid ${HAIR}`}}>
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center px-1 text-center text-[10px] leading-snug"
                style={{border: `1px dashed ${HAIR}`, color: MUTED}}
              >
                {u.status === 'pending' ? 'грузится…' : 'не загрузилось'}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="truncate text-[11px]" style={{color: MUTED}}>
                  {u.file.name}
                </p>
                {u.status === 'error' && (
                  <p role="alert" className="text-[12px] leading-snug" style={{color: SIGNAL}}>
                    {u.error}
                  </p>
                )}
              </div>
              {u.status === 'error' && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <EditorButton onClick={() => retry(u)}>
                    Повторить
                  </EditorButton>
                  <EditorButton tone="quiet" onClick={() => setUploads((prev) => prev.filter((x) => x.id !== u.id))}>
                    Отменить
                  </EditorButton>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <label
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="mt-3 flex min-h-[44px] cursor-pointer flex-col items-center gap-1 px-4 py-4 text-center transition-colors hover:bg-black/[0.02]"
        style={{border: `1px dashed ${HAIR}`}}
      >
        <span className="text-[12px]" style={{color: MUTED}}>
          Перетащите кадры сюда или выберите файлы
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png"
          multiple
          aria-label="Добавить кадры"
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </label>
    </div>
  );
}

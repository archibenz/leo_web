// Чистые функции над кадрами галереи варианта — ни одна не трогает React и не
// ходит в сеть, поэтому порядок и обложку можно проверить без рендера.
//
// Обложка — явный флаг на кадре, а не позиция в списке. «Первый в списке =
// главный» ломается каждый раз, когда владелец меняет порядок: см.
// task-admin-media-brief.md. `image` и `gallery` — как их хранит сервер
// (StorefrontVariantRequest) — здесь на экране показаны ОДНИМ списком, а
// собираются обратно в эту же пару прямо перед отправкой в PUT.

export type GalleryItem = {url: string; cover: boolean};

export function toItems(image: string, gallery: readonly string[]): GalleryItem[] {
  return [{url: image, cover: true}, ...gallery.map((url) => ({url, cover: false}))];
}

export function fromItems(items: readonly GalleryItem[]): {image: string; gallery: string[]} {
  const cover = items.find((i) => i.cover) ?? items[0];
  return {
    image: cover?.url ?? '',
    gallery: items.filter((i) => i !== cover).map((i) => i.url),
  };
}

// from/to вне диапазона или равны — список возвращается БЕЗ изменений (новой
// копией, не тем же объектом: вызывающая сторона не обязана об этом думать).
export function reorderTo(items: readonly GalleryItem[], from: number, to: number): GalleryItem[] {
  if (from === to || from < 0 || from >= items.length || to < 0 || to >= items.length) {
    return items.map((i) => ({...i}));
  }
  const next = items.map((i) => ({...i}));
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

export function markCover(items: readonly GalleryItem[], url: string): GalleryItem[] {
  return items.map((i) => ({...i, cover: i.url === url}));
}

// Хотя бы один кадр остаётся всегда — у карточки не может не быть снимка.
// Если убрали именно обложку, следующий кадр становится новой обложкой сам,
// явным действием этой функции, а не тайно через «первый по счёту».
export function removeItem(items: readonly GalleryItem[], url: string): GalleryItem[] {
  if (items.length <= 1) return items.map((i) => ({...i}));
  const filtered = items.filter((i) => i.url !== url);
  if (filtered.length === items.length) return filtered; // адреса не было — нечего убирать
  if (!filtered.some((i) => i.cover)) {
    return filtered.map((i, idx) => (idx === 0 ? {...i, cover: true} : {...i}));
  }
  return filtered;
}

export function appendItems(items: readonly GalleryItem[], urls: readonly string[]): GalleryItem[] {
  return [...items.map((i) => ({...i})), ...urls.map((url) => ({url, cover: false}))];
}

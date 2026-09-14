import {API_BASE, apiFetch, getToken} from '../../lib/api';

// Тонкая обёртка над ручками записи витрины. Ни одного своего правила: что
// можно править и что считается ошибкой, решает бэкенд — иначе редактор и
// публикация разъедутся, и владелец увидит одно, а получит другое.

const ROOT = '/api/admin/storefront';

export type DraftSummary = {kind: 'section' | 'model' | 'set'; id: string; key: string; fields: string[]};

// PUT принимает ЧАСТИЧНЫЙ патч и накапливает его поверх уже сохранённого
// черновика, поэтому шлём только тронутые поля. Отсутствие ключа — «не менять»,
// явный null — «очистить».
export type Patch = Record<string, unknown>;

function put(path: string, patch: Patch): Promise<unknown> {
  return apiFetch(path, {method: 'PUT', body: JSON.stringify(patch)});
}

export const saveSectionDraft = (id: string, patch: Patch) => put(`${ROOT}/sections/${id}`, patch);
export const saveVariantDraft = (variantId: string, patch: Patch) => put(`${ROOT}/products/${variantId}`, patch);
export const saveModelDraft = (modelId: string, patch: Patch) => put(`${ROOT}/models/${modelId}`, patch);

export const publishSection = (id: string) => apiFetch(`${ROOT}/sections/${id}/publish`, {method: 'POST'});
export const publishModel = (id: string) => apiFetch(`${ROOT}/models/${id}/publish`, {method: 'POST'});
export const publishSet = (id: string) => apiFetch(`${ROOT}/sets/${id}/publish`, {method: 'POST'});

export const discardSectionDraft = (id: string) => apiFetch(`${ROOT}/sections/${id}/draft`, {method: 'DELETE'});
export const discardModelDraft = (id: string) => apiFetch(`${ROOT}/models/${id}/draft`, {method: 'DELETE'});
export const discardSetDraft = (id: string) => apiFetch(`${ROOT}/sets/${id}/draft`, {method: 'DELETE'});

export const listDrafts = () => apiFetch<DraftSummary[]>(`${ROOT}/drafts`);

export function publish(kind: DraftSummary['kind'], id: string): Promise<unknown> {
  if (kind === 'section') return publishSection(id);
  if (kind === 'set') return publishSet(id);
  return publishModel(id);
}

export function discard(kind: DraftSummary['kind'], id: string): Promise<unknown> {
  if (kind === 'section') return discardSectionDraft(id);
  if (kind === 'set') return discardSetDraft(id);
  return discardModelDraft(id);
}

// Картинки и ролики идут разными ручками с разными правилами: ролик тяжелее
// 8 МБ или не того кодека получает отказ с просьбой прислать исходник в
// телеграм. Текст отказа приходит с бэкенда — здесь его не пересказываем.
//
// Мимо apiFetch нарочно: тот ставит Content-Type: application/json, а у
// multipart граница живёт внутри заголовка и её выставляет сам браузер.
// Авторизацию повторяем ровно как там — заголовок плюс cookie.
export async function uploadMedia(file: File, kind: 'image' | 'video'): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const token = getToken();
  const res = await fetch(`${API_BASE}${kind === 'video' ? '/api/admin/upload/video' : '/api/admin/upload'}`, {
    method: 'POST',
    body: form,
    headers: token ? {Authorization: `Bearer ${token}`} : undefined,
    credentials: 'include',
  });
  const body = (await res.json().catch(() => ({}))) as {url?: string; message?: string};
  if (!res.ok || !body.url) throw new Error(body.message ?? `upload failed: ${res.status}`);
  return body.url;
}

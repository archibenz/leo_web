// Разбор errors[] из ответа RestExceptionHandler.handleValidation:
// {"message": "Validation failed", "errors": [{field: "items[0].href", message: "…"}]}.
//
// Обработчик общий на весь API (бот, админка, витрина) и текст в message —
// английский по контракту; переводить его на русский здесь мы не пытаемся.
// Эти функции только РАЗБИРАЮТ ФОРМУ field ('items[N].ru'/'en'/'href'/'until'),
// а какой русский текст показать за каждым известным полем — решает TickerForm
// (там же, где взят useTranslations), не этот модуль: он остаётся чистым и
// проверяемым без next-intl.

export type KnownTickerField = 'ru' | 'en' | 'href' | 'until';

export type TickerFieldError =
  | {kind: 'known'; rowIndex: number; field: KnownTickerField}
  // Незнакомое поле — НЕ отбрасывается. Контракт ответа живёт отдельно от
  // панели (RestExceptionHandler обслуживает бот и админку тоже) и может
  // однажды прирасти новым полем строки — тогда панель обязана показать
  // отказ с именем этого поля как есть, а не промолчать.
  | {kind: 'unknown'; field: string};

const FIELD_PATTERN = /^items\[(\d+)\]\.(ru|en|href|until)$/;

export function classifyTickerFieldError(field: string): TickerFieldError {
  const match = FIELD_PATTERN.exec(field);
  if (!match) return {kind: 'unknown', field};
  return {kind: 'known', rowIndex: Number(match[1]), field: match[2] as KnownTickerField};
}

export type ApiFieldError = {field: string; message: string};

export type TickerErrorMap = {
  // Ключ — `${rowIndex}:${field}`, чтобы показать текст у ТОЙ строки и ТОГО
  // поля, а не общей плашкой сверху (это и было дефектом №2 в брифе).
  known: Map<string, {rowIndex: number; field: KnownTickerField}>;
  unknownFields: string[];
};

export function classifyTickerErrors(errors: ApiFieldError[] | null | undefined): TickerErrorMap {
  const known = new Map<string, {rowIndex: number; field: KnownTickerField}>();
  const unknownFields: string[] = [];
  for (const error of errors ?? []) {
    const classified = classifyTickerFieldError(error.field);
    if (classified.kind === 'known') {
      known.set(`${classified.rowIndex}:${classified.field}`, {rowIndex: classified.rowIndex, field: classified.field});
    } else {
      unknownFields.push(classified.field);
    }
  }
  return {known, unknownFields};
}

// apiFetch (lib/api.ts) кладёт разобранный JSON-ответ на err.body и бросает
// его как обычный Error — достать errors[] оттуда, ничего больше не
// предполагая о форме e. Любая другая форма (сетевой сбой без .body, не-Error
// вовсе, body без errors — так отвечает handleGeneric на 500) — undefined,
// не исключение: TickerForm обязан молчать не в НИ ОДНОМ из этих случаев,
// а не только когда errors[] распарсился.
export function extractApiFieldErrors(e: unknown): ApiFieldError[] | undefined {
  if (typeof e !== 'object' || e === null || !('body' in e)) return undefined;
  const body = (e as {body?: unknown}).body;
  if (typeof body !== 'object' || body === null || !('errors' in body)) return undefined;
  const errors = (body as {errors?: unknown}).errors;
  return Array.isArray(errors) ? (errors as ApiFieldError[]) : undefined;
}

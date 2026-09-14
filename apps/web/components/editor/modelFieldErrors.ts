import {extractApiFieldErrors, type ApiFieldError} from './tickerFieldErrors';

export {extractApiFieldErrors};
export type {ApiFieldError};

// Разбор errors[] из ответа RestExceptionHandler.handleValidation для формы
// текстов модели. В отличие от бегущей строки (tickerFieldErrors.ts,
// `items[N].ru`) поля здесь плоские: StorefrontAdminService.validated идёт по
// компонентам record'а StorefrontModelRequest напрямую (validator.validate(dto)),
// и ConstraintViolation.getPropertyPath() отдаёт имя поля как есть, без массива
// и индекса. extractApiFieldErrors переиспользован из tickerFieldErrors.ts без
// изменений: он не знает про форму поля вовсе и одинаков для любой панели.
//
// Только восемь полей — те, у которых в StorefrontModelRequest реально есть
// @NotBlank. storyRu/storyEn туда не входят: поле необязательное, сервер по
// нему сегодня не отказывает никогда, и включать его «на всякий случай» значило
// бы держать ветку, которую ни один тест не может покрасить.
export type KnownModelField =
  | 'nameRu'
  | 'nameEn'
  | 'descRu'
  | 'descEn'
  | 'compositionRu'
  | 'compositionEn'
  | 'careRu'
  | 'careEn';

const KNOWN_FIELDS: ReadonlySet<string> = new Set<KnownModelField>([
  'nameRu',
  'nameEn',
  'descRu',
  'descEn',
  'compositionRu',
  'compositionEn',
  'careRu',
  'careEn',
]);

export type ModelErrorMap = {
  known: Set<KnownModelField>;
  // Незнакомое поле — НЕ отбрасывается: validated() в saveModelDraft проверяет
  // ВЕСЬ StorefrontModelRequest (размеры, картинки, варианты — не только
  // тексты), и патч из этой формы может получить отказ по полю, которого
  // панель вовсе не рисует. Такой отказ обязан остаться видимым, а не
  // потеряться молча.
  unknownFields: string[];
};

export function classifyModelErrors(errors: ApiFieldError[] | null | undefined): ModelErrorMap {
  const known = new Set<KnownModelField>();
  const unknownFields: string[] = [];
  for (const error of errors ?? []) {
    if (KNOWN_FIELDS.has(error.field)) {
      known.add(error.field as KnownModelField);
    } else {
      unknownFields.push(error.field);
    }
  }
  return {known, unknownFields};
}

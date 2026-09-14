import {describe, it, expect} from 'vitest';
import {classifyModelErrors, extractApiFieldErrors} from '../modelFieldErrors';

// Разбор errors[] для формы текстов модели. В отличие от бегущей строки
// (tickerFieldErrors.test.ts, `items[0].href`) поля здесь плоские — имя поля
// само по себе, без индекса строки — потому что StorefrontModelRequest не
// массив, а validator.validate(dto) идёт по его компонентам напрямую.
//
// extractApiFieldErrors переиспользован из tickerFieldErrors.ts без изменений
// — его отдельно уже проверяет tickerFieldErrors.test.ts, здесь только
// подтверждаем, что реэкспорт указывает на ту же функцию.

describe('classifyModelErrors — весь errors[] сразу', () => {
  it('известные поля попадают в known как есть, без разбора на части', () => {
    const result = classifyModelErrors([
      {field: 'nameRu', message: 'must not be blank'},
      {field: 'careEn', message: 'must not be blank'},
    ]);
    expect(result.known).toEqual(new Set(['nameRu', 'careEn']));
    expect(result.unknownFields).toEqual([]);
  });

  it('все восемь обязательных полей StorefrontModelRequest распознаются', () => {
    const fields = ['nameRu', 'nameEn', 'descRu', 'descEn', 'compositionRu', 'compositionEn', 'careRu', 'careEn'];
    const result = classifyModelErrors(fields.map((field) => ({field, message: 'must not be blank'})));
    expect(result.known).toEqual(new Set(fields));
    expect(result.unknownFields).toEqual([]);
  });

  // storyRu/storyEn необязательны на сервере (нет @NotBlank) — сегодня по ним
  // отказа прийти не может, но ЕСЛИ он придёт, форма не должна проглотить его
  // молча: он обязан уйти в unknownFields и остаться видимым.
  it('storyRu — не в известных: сервер по нему сегодня не отказывает, а придёт — не должно потеряться', () => {
    const result = classifyModelErrors([{field: 'storyRu', message: 'unexpected'}]);
    expect(result.known.size).toBe(0);
    expect(result.unknownFields).toEqual(['storyRu']);
  });

  // validated() в saveModelDraft проверяет ВЕСЬ StorefrontModelRequest, не
  // только тексты — отказ может прийти по полю, которого эта форма не рисует
  // (sizes, image, variants...). Он не должен потеряться молча.
  it('незнакомое поле (не из текстов модели) уходит в unknownFields', () => {
    const result = classifyModelErrors([{field: 'sizes[0]', message: 'must not be blank'}]);
    expect(result.known.size).toBe(0);
    expect(result.unknownFields).toEqual(['sizes[0]']);
  });

  it('смесь известного и незнакомого — оба видны одновременно', () => {
    const result = classifyModelErrors([
      {field: 'nameRu', message: 'must not be blank'},
      {field: 'image', message: 'must be a valid media url'},
    ]);
    expect(result.known).toEqual(new Set(['nameRu']));
    expect(result.unknownFields).toEqual(['image']);
  });

  it('undefined/null/пустой массив — оба пустые, не бросает исключение', () => {
    expect(classifyModelErrors(undefined)).toEqual({known: new Set(), unknownFields: []});
    expect(classifyModelErrors(null)).toEqual({known: new Set(), unknownFields: []});
    expect(classifyModelErrors([])).toEqual({known: new Set(), unknownFields: []});
  });
});

describe('extractApiFieldErrors — реэкспорт из tickerFieldErrors.ts', () => {
  it('достаёт errors[] из err.body той же формы, что и у бегущей строки', () => {
    const err = Object.assign(new Error('Validation failed'), {
      status: 400,
      body: {message: 'Validation failed', errors: [{field: 'nameRu', message: 'must not be blank'}]},
    });
    expect(extractApiFieldErrors(err)).toEqual([{field: 'nameRu', message: 'must not be blank'}]);
  });
});

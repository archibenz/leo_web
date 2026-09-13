import {describe, it, expect} from 'vitest';
import {classifyTickerErrors, classifyTickerFieldError, extractApiFieldErrors} from '../tickerFieldErrors';

// Разбор `errors[].field` из ответа RestExceptionHandler (`items[0].href` и
// т.п.) в номер строки и имя поля — без текста: русский текст выбирает
// TickerForm по классификации, эти функции только разбирают форму строки.
//
// Обязательное требование (правка координатора после brief): незнакомое поле
// НИКОГДА не проваливается молча — оно уходит в unknown с исходной строкой
// как есть, а не отбрасывается.

describe('classifyTickerFieldError — один field из ответа', () => {
  it('items[0].href — известное поле известной строки', () => {
    expect(classifyTickerFieldError('items[0].href')).toEqual({kind: 'known', rowIndex: 0, field: 'href'});
  });

  it('items[12].ru — индекс строки двузначный, не только 0', () => {
    expect(classifyTickerFieldError('items[12].ru')).toEqual({kind: 'known', rowIndex: 12, field: 'ru'});
  });

  it.each(['en', 'until'] as const)('items[N].%s — тоже известное поле', (field) => {
    expect(classifyTickerFieldError(`items[3].${field}`)).toEqual({kind: 'known', rowIndex: 3, field});
  });

  it('items[0].somethingNew — незнакомое поле известной строки: unknown, исходная строка дословно', () => {
    expect(classifyTickerFieldError('items[0].somethingNew')).toEqual({kind: 'unknown', field: 'items[0].somethingNew'});
  });

  it('строка, вообще не похожая на items[N].field — unknown, а не исключение', () => {
    expect(classifyTickerFieldError('somethingTotallyDifferent')).toEqual({
      kind: 'unknown',
      field: 'somethingTotallyDifferent',
    });
  });

  it('пустая строка — unknown, не падает', () => {
    expect(classifyTickerFieldError('')).toEqual({kind: 'unknown', field: ''});
  });
});

describe('classifyTickerErrors — весь errors[] сразу', () => {
  it('известные поля расходятся по rowIndex:field, неизвестных нет', () => {
    const result = classifyTickerErrors([
      {field: 'items[0].href', message: 'href must be a local /path, not an external address'},
      {field: 'items[1].ru', message: 'must not be blank'},
    ]);
    expect(result.known.get('0:href')).toEqual({rowIndex: 0, field: 'href'});
    expect(result.known.get('1:ru')).toEqual({rowIndex: 1, field: 'ru'});
    expect(result.unknownFields).toEqual([]);
  });

  it('незнакомое поле уходит в unknownFields, а не теряется молча', () => {
    const result = classifyTickerErrors([{field: 'items[0].somethingNew', message: 'whatever the server says'}]);
    expect(result.known.size).toBe(0);
    expect(result.unknownFields).toEqual(['items[0].somethingNew']);
  });

  it('смесь известного и незнакомого — оба видны одновременно', () => {
    const result = classifyTickerErrors([
      {field: 'items[0].href', message: 'x'},
      {field: 'items[0].imageUrl', message: 'y'},
    ]);
    expect(result.known.get('0:href')).toEqual({rowIndex: 0, field: 'href'});
    expect(result.unknownFields).toEqual(['items[0].imageUrl']);
  });

  it('undefined/пустой массив — оба пустые, не бросает исключение', () => {
    expect(classifyTickerErrors(undefined)).toEqual({known: new Map(), unknownFields: []});
    expect(classifyTickerErrors(null)).toEqual({known: new Map(), unknownFields: []});
    expect(classifyTickerErrors([])).toEqual({known: new Map(), unknownFields: []});
  });
});

describe('extractApiFieldErrors — достать errors[] из пойманного исключения apiFetch', () => {
  it('достаёт errors[] из err.body — форма, в которой их кладёт lib/api.ts', () => {
    const err = Object.assign(new Error('Validation failed'), {
      status: 400,
      body: {message: 'Validation failed', errors: [{field: 'items[0].href', message: 'x'}]},
    });
    expect(extractApiFieldErrors(err)).toEqual([{field: 'items[0].href', message: 'x'}]);
  });

  it('нет errors в body (например handleGeneric — только message) — undefined, не бросает', () => {
    const err = Object.assign(new Error('Unexpected error'), {status: 500, body: {message: 'Unexpected error'}});
    expect(extractApiFieldErrors(err)).toBeUndefined();
  });

  it('вообще не апифетчевая ошибка (сетевой сбой, нет .body) — undefined', () => {
    expect(extractApiFieldErrors(new TypeError('Failed to fetch'))).toBeUndefined();
    expect(extractApiFieldErrors('строкой брошено')).toBeUndefined();
    expect(extractApiFieldErrors(undefined)).toBeUndefined();
  });
});

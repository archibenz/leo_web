'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import type {StorefrontSection, TickerItem, WhiteProduct} from '../../lib/catalogue/types';
import {HAIR, MUTED, SIGNAL} from '../../app/[locale]/wv-palette';
import {DateField, EditorButton, SelectField, TextField} from './EditorFields';
import {saveSectionDraft, type Patch} from './editorApi';
import {destinationFromHref, hrefForDestination, isLocalHref, type TickerDestinationKind} from './tickerDestination';
import {classifyTickerErrors, extractApiFieldErrors} from './tickerFieldErrors';

// Список строк бегущей строки. Одна форма на весь блок, а не на строку: сервер
// принимает `items` целиком, тем же слиянием, что и заголовок героя — массив
// заменяется, не сливается по элементам (StorefrontDraftMerge).

// «Куда ведёт» — выбор словами (tickerDestination.ts), не свободный текст:
// владелец однажды вписал сюда «Коллекция» и получил 400 дважды на живом
// сайте (task-ticker-ux-brief.md). destination/productSlug/customHref вместе
// решают, какой href уйдёт на сервер — сам href в состоянии формы не хранится,
// чтобы выбор и текст не могли разойтись.
type Row = {
  ru: string;
  en: string;
  destination: TickerDestinationKind;
  productSlug: string;
  customHref: string;
  until: string;
};

const MAX_ROWS = 20;

function emptyRow(): Row {
  return {ru: '', en: '', destination: 'none', productSlug: '', customHref: '', until: ''};
}

function toRow(item: TickerItem, locale: string, productSlugs: readonly string[]): Row {
  const {kind, productSlug, customHref} = destinationFromHref(item.href, locale, productSlugs);
  return {ru: item.ru, en: item.en ?? '', until: item.until ?? '', destination: kind, productSlug, customHref};
}

// Отправляемая форма отличается от TickerItem: пустое необязательное поле
// уезжает явным null, а не пропущенным ключом — тот же тон, что у SectionForm
// (patchOf там же), и по той же причине: «снять» это намерение, а не забытый
// ключ, и на JSONB-массиве, который целиком заменяется, это единственный
// способ сказать «здесь пусто» осознанно, а не просто ничего не приложить.
type TickerItemWire = {ru: string; en: string | null; href: string | null; until: string | null};

function toWire(row: Row, locale: string): TickerItemWire {
  return {
    ru: row.ru,
    en: row.en.trim() ? row.en : null,
    href: hrefForDestination({kind: row.destination, locale, productSlug: row.productSlug, customHref: row.customHref}),
    until: row.until.trim() ? row.until : null,
  };
}

function initial(section: StorefrontSection, locale: string, productSlugs: readonly string[]): Row[] {
  return (section.items ?? []).map((item) => toRow(item, locale, productSlugs));
}

function swap<T>(list: T[], a: number, b: number): T[] {
  const next = [...list];
  [next[a], next[b]] = [next[b]!, next[a]!];
  return next;
}

// «Своя ссылка» невалидна, только если в неё что-то вписали и это что-то не
// проходит серверное правило — пустая «Своя ссылка» равнозначна «Без ссылки»
// и сохраняется свободно.
function customHrefInvalid(row: Row): boolean {
  const value = row.customHref.trim();
  return row.destination === 'custom' && value !== '' && !isLocalHref(value);
}

export default function TickerForm({section, products, locale, onSaved}: {
  section: StorefrontSection;
  products: WhiteProduct[];
  // Локаль страницы, на которой открыта панель — приходит явным пропом от
  // app/[locale]/page.tsx (через EditorProvider/EditorPanel), тем же способом,
  // каким её уже получает WhiteLocaleSwitch.tsx: серверный params.locale —
  // надёжнее, чем разбирать usePathname() на клиенте (next-intl иногда режет
  // локаль из пути, WhiteLocaleSwitch.tsx разбирает оба случая на глаз).
  locale: string;
  onSaved: () => void;
}) {
  const t = useTranslations('editor.ticker');
  const productSlugs = products.map((p) => p.slug);

  const [before] = useState(() => initial(section, locale, productSlugs));
  const [rows, setRows] = useState<Row[]>(() => initial(section, locale, productSlugs));
  const [busy, setBusy] = useState(false);
  // Общая плашка — только для отказов, которые НЕ удалось привязать ни к
  // какой строке (незнакомое поле или ответ вовсе без errors[]). Известные
  // поля известных строк идут в fieldErrors и рисуются у себя (см. save()).
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const dirty = JSON.stringify(rows) !== JSON.stringify(before);
  const blockedByInvalidHref = rows.some(customHrefInvalid);
  const setRow = (i: number) => (patch: Partial<Row> | ((row: Row) => Partial<Row>)) =>
    setRows((list) => list.map((row, j) => (j === i ? {...row, ...(typeof patch === 'function' ? patch(row) : patch)} : row)));

  function addRow() {
    setRows((list) => [...list, emptyRow()]);
  }
  function removeRow(i: number) {
    setRows((list) => list.filter((_, j) => j !== i));
  }
  function moveRow(i: number, delta: -1 | 1) {
    setRows((list) => swap(list, i, i + delta));
  }

  async function save() {
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const patch: Patch = {items: rows.map((row) => toWire(row, locale))};
      await saveSectionDraft(section.id, patch);
      onSaved();
    } catch (e) {
      const {known, unknownFields} = classifyTickerErrors(extractApiFieldErrors(e));
      if (known.size === 0 && unknownFields.length === 0) {
        // Ни одной строки не распозналось — либо ответ вовсе не про валидацию
        // (500, handleGeneric), либо сеть отвалилась. body.message (или
        // e.message) сюда никогда не попадает: он английский по контракту
        // (RestExceptionHandler общий на бот, админку и витрину).
        setError(t('errors.generic'));
      } else {
        const next: Record<string, string> = {};
        known.forEach(({field}, key) => {
          next[key] = t(`errors.${field}`);
        });
        setFieldErrors(next);
        if (unknownFields.length > 0) {
          // Незнакомое поле не проваливается молча: показываем общий русский
          // текст с именем поля из ответа дословно — контракт может однажды
          // прирасти полем, о котором эта панель не знает.
          setError(unknownFields.map((field) => t('errors.unknownField', {field})).join(' '));
        }
      }
    } finally {
      setBusy(false);
    }
  }

  const destinationOptions = [
    {value: 'none', label: t('destinationNone')},
    {value: 'shop', label: t('destinationShop')},
    {value: 'sets', label: t('destinationSets')},
    {value: 'lookbook', label: t('destinationLookbook')},
    {value: 'product', label: t('destinationProduct')},
    {value: 'custom', label: t('destinationCustom')},
  ];
  const productOptions = products.map((p) => ({value: p.slug, label: p.ru}));

  return (
    <div className="flex flex-col gap-5">
      {rows.length === 0 && (
        <p className="text-[12px]" style={{color: MUTED}}>
          Строк нет — полосы на сайте не будет, пока не добавите первую.
        </p>
      )}
      {rows.map((row, i) => {
        const hrefError = customHrefInvalid(row) ? t('errors.href') : fieldErrors[`${i}:href`];
        return (
          <div key={i} className="flex flex-col gap-3 pb-4" style={{borderBottom: `1px solid ${HAIR}`}}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.18em]" style={{color: MUTED}}>
                Строка {i + 1}
              </span>
              <div className="flex gap-1">
                <EditorButton tone="quiet" onClick={() => moveRow(i, -1)} disabled={i === 0}>
                  вверх
                </EditorButton>
                <EditorButton tone="quiet" onClick={() => moveRow(i, 1)} disabled={i === rows.length - 1}>
                  вниз
                </EditorButton>
                <EditorButton tone="signal" onClick={() => removeRow(i)}>
                  убрать
                </EditorButton>
              </div>
            </div>
            {/* Номер строки — часть подписи каждого поля, не только текст рядом:
                у всех строк одинаковые по смыслу поля, и без номера в подписи
                screen reader читает «Текст (ru)» неотличимо для каждой из них,
                а id у TextField/DateField дублировался бы в разметке. */}
            <TextField
              label={`Текст (ru) · строка ${i + 1}`}
              value={row.ru}
              onChange={(v) => setRow(i)({ru: v})}
              error={fieldErrors[`${i}:ru`]}
            />
            <TextField
              label={`Текст (en) · строка ${i + 1}`}
              value={row.en}
              onChange={(v) => setRow(i)({en: v})}
              error={fieldErrors[`${i}:en`]}
            />
            <SelectField
              label={`${t('destinationLabel')} · строка ${i + 1}`}
              value={row.destination}
              onChange={(next) =>
                setRow(i)((current) => ({
                  destination: next as TickerDestinationKind,
                  // Первый выбор товара при входе в режим «Конкретный товар» —
                  // сразу рабочий href, а не пустой список, ждущий второго клика.
                  productSlug: next === 'product' && !current.productSlug ? (products[0]?.slug ?? '') : current.productSlug,
                }))
              }
              options={destinationOptions}
              error={row.destination !== 'custom' ? hrefError : undefined}
            />
            {row.destination === 'product' &&
              (productOptions.length > 0 ? (
                <SelectField
                  label={`${t('productLabel')} · строка ${i + 1}`}
                  value={row.productSlug}
                  onChange={(slug) => setRow(i)({productSlug: slug})}
                  options={productOptions}
                  error={hrefError}
                />
              ) : (
                <p className="text-[13px] leading-snug" style={{color: MUTED}}>
                  {t('productEmpty')}
                </p>
              ))}
            {row.destination === 'custom' && (
              <TextField
                label={`${t('customLabel')} · строка ${i + 1}`}
                value={row.customHref}
                onChange={(v) => setRow(i)({customHref: v})}
                hint={t('customHint')}
                error={hrefError}
              />
            )}
            <DateField
              label={`Показывать до, МСК · строка ${i + 1}`}
              value={row.until || null}
              onChange={(v) => setRow(i)({until: v ?? ''})}
              hint="Пусто — строка не пропадает сама по себе."
              error={fieldErrors[`${i}:until`]}
            />
          </div>
        );
      })}
      <EditorButton onClick={addRow} disabled={rows.length >= MAX_ROWS}>
        Добавить строку
      </EditorButton>
      {rows.length >= MAX_ROWS && (
        <p className="text-[11px] leading-snug" style={{color: MUTED}}>
          Больше {MAX_ROWS} строк не поместится — это бегущая строка, а не лента новостей.
        </p>
      )}
      {error && (
        <p role="alert" className="text-[13px] leading-snug" style={{color: SIGNAL}}>
          {error}
        </p>
      )}
      <EditorButton tone="solid" onClick={() => void save()} disabled={!dirty || busy || blockedByInvalidHref}>
        {busy ? 'сохраняю…' : 'Сохранить в черновик'}
      </EditorButton>
    </div>
  );
}

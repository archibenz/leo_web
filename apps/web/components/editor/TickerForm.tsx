'use client';

import {useState} from 'react';
import type {StorefrontSection, TickerItem} from '../../lib/catalogue/types';
import {HAIR, MUTED, SIGNAL} from '../../app/[locale]/wv-palette';
import {DateField, EditorButton, TextField} from './EditorFields';
import {saveSectionDraft, type Patch} from './editorApi';

// Список строк бегущей строки. Одна форма на весь блок, а не на строку: сервер
// принимает `items` целиком, тем же слиянием, что и заголовок героя — массив
// заменяется, не сливается по элементам (StorefrontDraftMerge).

// Форма держит все четыре поля строкой, включая дату — контролируемым полям
// проще жить с одним типом; пустая строка на выходе превращается в null.
type Row = {ru: string; en: string; href: string; until: string};

const MAX_ROWS = 20;

function toRow(item: TickerItem): Row {
  return {ru: item.ru, en: item.en ?? '', href: item.href ?? '', until: item.until ?? ''};
}

// Отправляемая форма отличается от TickerItem: пустое необязательное поле
// уезжает явным null, а не пропущенным ключом — тот же тон, что у SectionForm
// (patchOf там же), и по той же причине: «снять» это намерение, а не забытый
// ключ, и на JSONB-массиве, который целиком заменяется, это единственный
// способ сказать «здесь пусто» осознанно, а не просто ничего не приложить.
type TickerItemWire = {ru: string; en: string | null; href: string | null; until: string | null};

function toWire(row: Row): TickerItemWire {
  return {
    ru: row.ru,
    en: row.en.trim() ? row.en : null,
    href: row.href.trim() ? row.href : null,
    until: row.until.trim() ? row.until : null,
  };
}

function initial(section: StorefrontSection): Row[] {
  return (section.items ?? []).map(toRow);
}

function swap<T>(list: T[], a: number, b: number): T[] {
  const next = [...list];
  [next[a], next[b]] = [next[b]!, next[a]!];
  return next;
}

export default function TickerForm({section, onSaved}: {section: StorefrontSection; onSaved: () => void}) {
  const [before] = useState(() => initial(section));
  const [rows, setRows] = useState<Row[]>(() => initial(section));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = JSON.stringify(rows) !== JSON.stringify(before);
  const setRow = (i: number) => (patch: Partial<Row>) =>
    setRows((list) => list.map((row, j) => (j === i ? {...row, ...patch} : row)));

  function addRow() {
    setRows((list) => [...list, {ru: '', en: '', href: '', until: ''}]);
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
    try {
      const patch: Patch = {items: rows.map(toWire)};
      await saveSectionDraft(section.id, patch);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'не сохранилось');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {rows.length === 0 && (
        <p className="text-[12px]" style={{color: MUTED}}>
          Строк нет — полосы на сайте не будет, пока не добавите первую.
        </p>
      )}
      {rows.map((row, i) => (
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
          <TextField label={`Текст (ru) · строка ${i + 1}`} value={row.ru} onChange={(v) => setRow(i)({ru: v})} />
          <TextField label={`Текст (en) · строка ${i + 1}`} value={row.en} onChange={(v) => setRow(i)({en: v})} />
          <TextField label={`Куда ведёт · строка ${i + 1}`} value={row.href} onChange={(v) => setRow(i)({href: v})} />
          <DateField
            label={`Показывать до, МСК · строка ${i + 1}`}
            value={row.until || null}
            onChange={(v) => setRow(i)({until: v ?? ''})}
            hint="Пусто — строка не пропадает сама по себе."
          />
        </div>
      ))}
      <EditorButton onClick={addRow} disabled={rows.length >= MAX_ROWS}>
        Добавить строку
      </EditorButton>
      {rows.length >= MAX_ROWS && (
        <p className="text-[11px] leading-snug" style={{color: MUTED}}>
          Больше {MAX_ROWS} строк не поместится — это бегущая строка, а не лента новостей.
        </p>
      )}
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

'use client';

import {useRef, useState, type ReactNode} from 'react';
import {HAIR, INK, MUTED, SIGNAL} from '../../app/[locale]/wv-palette';
import {uploadMedia} from './editorApi';

// Поля редактора в языке витрины: волосяная линия вместо рамки, прямые углы,
// подписи капителью. Готовой кнопки shadcn в этой ветке нет — примитивы
// `components/ui/button.tsx` приезжают с ветками подвала и входа, и тащить их
// сюда значило бы тянуть чужую незавершённую работу.

export function EditorLabel({children}: {children: ReactNode}) {
  return (
    <span className="mb-1.5 block text-[10px] uppercase tracking-[0.18em]" style={{color: MUTED}}>
      {children}
    </span>
  );
}

const inputClass =
  'w-full bg-white px-3 py-2 text-[13px] outline-none transition-colors focus:border-[#1c1714]';

export function TextField({label, value, onChange, rows}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
}) {
  const id = `wv-edit-${label.replace(/\s+/g, '-')}`;
  return (
    <label htmlFor={id} className="block">
      <EditorLabel>{label}</EditorLabel>
      {rows ? (
        <textarea
          id={id}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          style={{border: `1px solid ${HAIR}`, color: INK}}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          style={{border: `1px solid ${HAIR}`, color: INK}}
        />
      )}
    </label>
  );
}

// Пустое поле цены — это ПРЕДЗАКАЗ, а не ноль: витрина показывает «Предзаказ»
// и ничего не кладёт в корзину. Поэтому '' уезжает как null, а не как 0.
export function NumberField({label, value, onChange, hint}: {
  label: string;
  value: number | null;
  onChange: (next: number | null) => void;
  hint?: string;
}) {
  const id = `wv-edit-${label.replace(/\s+/g, '-')}`;
  return (
    <label htmlFor={id} className="block">
      <EditorLabel>{label}</EditorLabel>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className={inputClass}
        style={{border: `1px solid ${HAIR}`, color: INK}}
      />
      {hint && (
        <span className="mt-1 block text-[11px] leading-snug" style={{color: MUTED}}>
          {hint}
        </span>
      )}
    </label>
  );
}

// 'YYYY-MM-DD' or null — never a Date object, so the same string round-trips
// straight into the JSONB item and into the server's own regex validation.
export function DateField({label, value, onChange, hint}: {
  label: string;
  value: string | null;
  onChange: (next: string | null) => void;
  hint?: string;
}) {
  const id = `wv-edit-${label.replace(/\s+/g, '-')}`;
  return (
    <label htmlFor={id} className="block">
      <EditorLabel>{label}</EditorLabel>
      <input
        id={id}
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
        className={inputClass}
        style={{border: `1px solid ${HAIR}`, color: INK}}
      />
      {hint && (
        <span className="mt-1 block text-[11px] leading-snug" style={{color: MUTED}}>
          {hint}
        </span>
      )}
    </label>
  );
}

export function MediaField({label, value, kind, onChange}: {
  label: string;
  value: string | undefined;
  kind: 'image' | 'video';
  onChange: (next: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadMedia(file, kind));
    } catch (e) {
      // Текст отказа приходит с бэкенда («пришлите в телеграм» и прочее) —
      // здесь его не сочиняем заново.
      setError(e instanceof Error ? e.message : 'не загрузилось');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div>
      <EditorLabel>{label}</EditorLabel>
      <p className="mb-1.5 break-all text-[12px]" style={{color: value ? INK : MUTED}}>
        {value ?? 'не задано'}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <EditorButton onClick={() => input.current?.click()} disabled={busy}>
          {busy ? 'загружаю…' : 'Заменить'}
        </EditorButton>
        {value && (
          <EditorButton tone="quiet" onClick={() => onChange(null)}>
            Убрать
          </EditorButton>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={kind === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/png'}
        className="hidden"
        aria-label={label}
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      {error && (
        <p role="alert" className="mt-2 text-[12px] leading-snug" style={{color: SIGNAL}}>
          {error}
        </p>
      )}
    </div>
  );
}

export function EditorButton({children, onClick, disabled, tone = 'plain', type = 'button'}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'plain' | 'solid' | 'quiet' | 'signal';
  type?: 'button' | 'submit';
}) {
  const base =
    'inline-flex items-center justify-center px-3 py-2 text-[11px] uppercase tracking-[0.16em] transition-colors disabled:opacity-45';
  const style =
    tone === 'solid'
      ? {background: INK, color: '#fff', border: `1px solid ${INK}`}
      : tone === 'signal'
        ? {background: 'transparent', color: SIGNAL, border: `1px solid ${SIGNAL}`}
        : tone === 'quiet'
          ? {background: 'transparent', color: MUTED, border: `1px solid ${HAIR}`}
          : {background: 'transparent', color: INK, border: `1px solid ${INK}`};
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={base} style={style}>
      {children}
    </button>
  );
}

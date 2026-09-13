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

// Кадр показывается картинкой размером под палец — адрес есть, но мелко и не
// вместо кадра. Владелец один раз уже увидел галерею строками адресов файлов
// и сказал «сделай просто»; это тот самый угол, где адрес мог бы вернуться.
export function MediaThumb({src, kind, alt}: {src: string; kind: 'image' | 'video'; alt: string}) {
  if (!src) {
    return (
      <div
        className="flex h-20 w-20 shrink-0 items-center justify-center px-1 text-center text-[10px] leading-snug"
        style={{border: `1px dashed ${HAIR}`, color: MUTED}}
      >
        нет кадра
      </div>
    );
  }
  return (
    <div className="h-20 w-20 shrink-0 overflow-hidden bg-white" style={{border: `1px solid ${HAIR}`}} title={src}>
      {kind === 'video' ? (
        // muted+playsInline — не автоплей, а способ показать первый кадр
        // ролика без звука и без ухода в полноэкранный режим на iOS.
        <video src={src} muted playsInline preload="metadata" aria-label={alt} className="h-full w-full object-cover" />
      ) : (
        // Админ-превью произвольного /uploads-пути — вне allow-list next/image
        // и не влияет на LCP покупателя, поэтому обычный <img> — осознанный выбор.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      )}
    </div>
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
      <div className="flex items-start gap-3">
        <MediaThumb src={value ?? ''} kind={kind} alt={label} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* truncate, не break-all: в узкой колонке (MediaPairField — два
              MediaField рядом на панели в 360px) длинный путь посимвольным
              переносом растягивал строку на весь экран и утаскивал кнопки
              вниз — поймано на этой же панели в GalleryField, см. её комментарий.
              Свой title тут не нужен — он уже есть у обёртки MediaThumb. */}
          <p className="truncate text-[11px]" style={{color: MUTED}}>
            {value ?? 'не задано'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <EditorButton size="touch" onClick={() => input.current?.click()} disabled={busy}>
              {busy ? 'загружаю…' : 'Заменить'}
            </EditorButton>
            {value && (
              <EditorButton size="touch" tone="quiet" onClick={() => onChange(null)}>
                Убрать
              </EditorButton>
            )}
          </div>
        </div>
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

// Телефон и десктоп — РЯДОМ и подписаны, не два одинаковых MediaField друг
// под другом без объяснения. У секций (герой, тизер сетов) уже есть обе
// версии в данных — не показать их вместе значит заставить владельца
// держать в голове, какое поле для какого экрана.
export function MediaPairField({label, kind, phone, desktop}: {
  label: string;
  kind: 'image' | 'video';
  phone: {value: string | undefined; onChange: (next: string | null) => void};
  desktop: {value: string | undefined; onChange: (next: string | null) => void};
}) {
  return (
    <div>
      <EditorLabel>{label}</EditorLabel>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MediaField label="Телефон" kind={kind} value={phone.value} onChange={phone.onChange} />
        <MediaField label="Десктоп" kind={kind} value={desktop.value} onChange={desktop.onChange} />
      </div>
    </div>
  );
}

export function EditorButton({children, onClick, disabled, tone = 'plain', type = 'button', size = 'sm'}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'plain' | 'solid' | 'quiet' | 'signal';
  type?: 'button' | 'submit';
  // 'touch' — только для элементов этой ветки, где палец на телефоне должен
  // попасть наверняка: перестановка кадров, обложка, загрузка. Остальные
  // кнопки редактора ('sm', по умолчанию) не трогаем — не тот масштаб задачи.
  size?: 'sm' | 'touch';
}) {
  const base =
    size === 'touch'
      ? 'inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-[13px] uppercase tracking-[0.12em] transition-colors disabled:opacity-45'
      : 'inline-flex items-center justify-center px-3 py-2 text-[11px] uppercase tracking-[0.16em] transition-colors disabled:opacity-45';
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

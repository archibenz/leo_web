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

export function TextField({label, value, onChange, rows, hint, error}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  hint?: string;
  // Отказ конкретно этого поля — рядом с ним, а не общей плашкой над формой.
  // Владелец однажды вписал в «Куда ведёт» «Коллекция», получил 400 и понятия
  // не имел, что именно не так — текст сверху был по-английски и ни о чём.
  error?: string;
}) {
  const id = `wv-edit-${label.replace(/\s+/g, '-')}`;
  const errorId = `${id}-error`;
  return (
    <div>
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
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
        ) : (
          <input
            id={id}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
            style={{border: `1px solid ${HAIR}`, color: INK}}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
        )}
      </label>
      {hint && (
        <span className="mt-1 block text-[11px] leading-snug" style={{color: MUTED}}>
          {hint}
        </span>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-[13px] leading-snug" style={{color: SIGNAL}}>
          {error}
        </p>
      )}
    </div>
  );
}

// Пустое поле цены — это ПРЕДЗАКАЗ, а не ноль: витрина показывает «Предзаказ»
// и ничего не кладёт в корзину. Поэтому '' уезжает как null, а не как 0.
export function NumberField({label, value, onChange, hint, disabled}: {
  label: string;
  value: number | null;
  onChange: (next: number | null) => void;
  hint?: string;
  // Поле не спрятано, а именно disabled — владелец обязан ВИДЕТЬ, что здесь
  // есть значение, которое сейчас ни на что не влияет (см. VariantForm,
  // manualPriceInactive), а не решить, что поле пропало или сломалось.
  disabled?: boolean;
}) {
  const id = `wv-edit-${label.replace(/\s+/g, '-')}`;
  return (
    // Хинт — СНАРУЖИ <label>, не внутри (как раньше): вложенный текст входит в
    // вычисляемое имя <label>, и getByLabelText('Цена, ₽') перестаёт находить
    // поле, как только у него появляется hint — имя становится «Цена, ₽Пусто —
    // предзаказ…» целиком. Тот же приём, что уже в TextField/DateField.
    <div>
      <label htmlFor={id} className="block">
        <EditorLabel>{label}</EditorLabel>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          className={`${inputClass}${disabled ? ' opacity-50' : ''}`}
          style={{border: `1px solid ${HAIR}`, color: INK}}
          disabled={disabled}
        />
      </label>
      {hint && (
        <span className="mt-1 block text-[11px] leading-snug" style={{color: MUTED}}>
          {hint}
        </span>
      )}
    </div>
  );
}

// Скидка, % — целое (границы проверяет и подписывает вызывающая форма, см.
// VariantForm.discountPctError). min-h-11 — тот же приём, что у SelectField
// ниже: голый inputClass (px-3 py-2 при text-[13px]) не дотягивает до 44px, а
// зона нажатия НОВОГО поля обязана — в отличие от старых полей этой же формы,
// которые её сегодня нарушают (лов lw-cjzy, отдельный бид, не этот).
//
// type="text" + inputMode="numeric", НЕ type="number": у number-инпута
// одинокий минус (первая клавиша отрицательного значения) браузер
// санитизирует ДО того, как код увидит e.target.value — оно читается пустым,
// React тут же откатывает контролируемое поле к последнему принятому числу, и
// «−1» физически не набрать (поймано на тесте отбоя отрицательной скидки).
// text этой санитизации не подвержен вовсе; числовая клавиатура на телефоне
// всё равно приходит через inputMode.
export function PercentField({label, value, onChange, hint, error}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  hint?: string;
  error?: string;
}) {
  const id = `wv-edit-${label.replace(/\s+/g, '-')}`;
  const errorId = `${id}-error`;
  // Буфер — строка, не то же самое число, что снаружи: видимое поле обязано
  // показывать РОВНО то, что напечатано, включая промежуточные состояния
  // («−», пусто), которые сами по себе ещё не число и наружу не уходят.
  // useState(() => …) — ленивый инициализатор, читает value только на монтаж:
  // PercentField размонтируется целиком при смене варианта (см. VariantForm —
  // интерстишл «читаю карточку…» между вариантами), так что чужое значение
  // сюда не протечёт без явной синхронизации.
  const [text, setText] = useState(() => String(value));

  return (
    <div>
      <label htmlFor={id} className="block">
        <EditorLabel>{label}</EditorLabel>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={text}
          onChange={(e) => {
            const raw = e.target.value;
            setText(raw);
            if (raw === '') {
              onChange(0);
              return;
            }
            const next = Number(raw);
            // NaN — промежуточное состояние вроде одного «−»: буфер его уже
            // показывает (setText выше), а наружу ждём следующую цифру.
            if (!Number.isNaN(next)) onChange(next);
          }}
          className={`${inputClass} min-h-11`}
          style={{border: `1px solid ${HAIR}`, color: INK}}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
      </label>
      {hint && (
        <span className="mt-1 block text-[11px] leading-snug" style={{color: MUTED}}>
          {hint}
        </span>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-[13px] leading-snug" style={{color: SIGNAL}}>
          {error}
        </p>
      )}
    </div>
  );
}

// 'YYYY-MM-DD', разобранная как UTC-дата и так же отформатированная —
// new Date(value) без явного времени/зоны разобрал бы её как UTC-полночь, а
// toLocaleDateString в часовом поясе западнее UTC сдвинул бы день на сутки
// назад. Тот же класс ошибки, которого TickerItem.until (lib/catalogue/types.ts)
// уже избегает, сравнивая даты строками, а не объектами Date.
function formatUntilRu(value: string): string | null {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('ru-RU', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'}).format(date);
}

// 'YYYY-MM-DD' or null — never a Date object, so the same string round-trips
// straight into the JSONB item and into the server's own regex validation.
export function DateField({label, value, onChange, hint, error}: {
  label: string;
  value: string | null;
  onChange: (next: string | null) => void;
  hint?: string;
  error?: string;
}) {
  const id = `wv-edit-${label.replace(/\s+/g, '-')}`;
  const errorId = `${id}-error`;
  // Сам пикер не трогаем — владелец его похвалил, и формат ЕГО собственного
  // popup браузер берёт из локали устройства, а не из lang страницы, нам не
  // подчиняется. Эта строка — единственное, что мы контролируем и меняем.
  const readable = value ? formatUntilRu(value) : null;
  return (
    <div>
      <label htmlFor={id} className="block">
        <EditorLabel>{label}</EditorLabel>
        <input
          id={id}
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
          className={inputClass}
          style={{border: `1px solid ${HAIR}`, color: INK}}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
      </label>
      {readable && (
        <p className="mt-1 text-[13px] leading-snug" style={{color: MUTED}}>
          {readable}
        </p>
      )}
      {hint && (
        <span className="mt-1 block text-[11px] leading-snug" style={{color: MUTED}}>
          {hint}
        </span>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-[13px] leading-snug" style={{color: SIGNAL}}>
          {error}
        </p>
      )}
    </div>
  );
}

// Тот же примитив, что TextField/DateField выше: подпись капителью, волосяная
// линия вместо рамки, свой текст ошибки рядом с полем. min-h-11 — единственное
// отличие от inputClass: 44px, зона нажатия пальцем (см. WhiteLocaleSwitch.tsx,
// h-11/min-w-11 — тот же приём для локали на витрине). Нативный <select>
// открывается пальцем на телефоне сам, без дополнительного JS.
//
// aria-label дублирует то, что и так даёт обёртка <label> — не для screen
// reader (там оба пути равнозначны), а потому что вычисленное ИМЯ <select>,
// обёрнутого в <label> БЕЗ aria-label, в реальном Chromium утягивает текст
// ВСЕХ <option> внутрь (в отличие от dom-accessibility-api, которым считает
// имена jsdom/testing-library — там вычисляется чисто). Explicit aria-label
// имеет приоритет и коротит эту разницу — без него getByLabel(exact:true) в
// Playwright не находит поле, хотя те же вью-тесты на jsdom зелёные.
export function SelectField({label, value, onChange, options, hint, error}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: {value: string; label: string}[];
  hint?: string;
  error?: string;
}) {
  const id = `wv-edit-${label.replace(/\s+/g, '-')}`;
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="block">
        <EditorLabel>{label}</EditorLabel>
        <select
          id={id}
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} min-h-11`}
          style={{border: `1px solid ${HAIR}`, color: INK}}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {hint && (
        <span className="mt-1 block text-[11px] leading-snug" style={{color: MUTED}}>
          {hint}
        </span>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-[13px] leading-snug" style={{color: SIGNAL}}>
          {error}
        </p>
      )}
    </div>
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

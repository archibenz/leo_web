'use client';

import {useEffect, useState} from 'react';
import {apiFetch} from '../../lib/api';
import {HAIR, INK, MUTED, SIGNAL} from '../../app/[locale]/wv-palette';
import {EditorButton, TextField} from './EditorFields';
import {saveModelDraft, type Patch} from './editorApi';
import {classifyModelErrors, extractApiFieldErrors, type KnownModelField} from './modelFieldErrors';

// Название, короткое описание, история, состав и уход модели — та же карточка,
// что уже открывает VariantForm (apiFetch<ModelDto> отдаёт её целиком, черновик
// уже наложен), новых обращений к сети не заводим.
//
// Раскладка — по замеру 14.09 (бид lw-ns8g): панель на телефоне — около 460px
// высоты (62vh), десять полей подряд не влезают без прокрутки в три экрана.
// Русские поля раскрыты — ими правят чаще; английские собраны в свёрнутый по
// умолчанию раздел — они необязательны (владелец сам так решил).

type ModelDto = {
  nameRu: string | null;
  nameEn: string | null;
  descRu: string | null;
  descEn: string | null;
  storyRu: string | null;
  storyEn: string | null;
  compositionRu: string | null;
  compositionEn: string | null;
  careRu: string | null;
  careEn: string | null;
  sizes?: string[] | null;
};

// Размеры модели — набор кнопок на карточке. Порядок показа — канонический,
// а не порядок нажатий: иначе владелец, добавив XXL после S, получил бы на
// сайте «XS S XXL M». Размер вне списка (если такой уже есть в базе) не
// теряется — он показывается и остаётся, пока его не снимут.
export const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

function ordered(sizes: readonly string[]): string[] {
  const rank = (s: string) => {
    const i = (SIZE_ORDER as readonly string[]).indexOf(s);
    return i === -1 ? SIZE_ORDER.length : i;
  };
  return [...new Set(sizes)].sort((a, b) => rank(a) - rank(b));
}

type Draft = {
  nameRu: string;
  nameEn: string;
  descRu: string;
  descEn: string;
  storyRu: string;
  storyEn: string;
  compositionRu: string;
  compositionEn: string;
  careRu: string;
  careEn: string;
  sizes: string[];
};

function initial(model: ModelDto): Draft {
  return {
    nameRu: model.nameRu ?? '',
    nameEn: model.nameEn ?? '',
    descRu: model.descRu ?? '',
    descEn: model.descEn ?? '',
    storyRu: model.storyRu ?? '',
    storyEn: model.storyEn ?? '',
    compositionRu: model.compositionRu ?? '',
    compositionEn: model.compositionEn ?? '',
    careRu: model.careRu ?? '',
    careEn: model.careEn ?? '',
    sizes: ordered(model.sizes ?? []),
  };
}

// storyRu/storyEn — необязательные в StorefrontModelRequest (нет @NotBlank):
// пустая строка там значит «убрать», то есть null — тот же приём, что у
// SectionForm.bodyRu/bodyEn. Остальные восемь полей обязательны: у них пустая
// строка не «убрать», а невозможное значение, и патч с такой строкой до сети
// не доходит вовсе (см. blankRequiredFields ниже).
const OPTIONAL_FIELDS = new Set<keyof Draft>(['storyRu', 'storyEn']);

function patchOf(before: Draft, now: Draft): Patch {
  const patch: Patch = {};
  (Object.keys(now) as (keyof Draft)[]).forEach((key) => {
    const value = now[key];
    if (Array.isArray(value)) {
      if (JSON.stringify(before[key]) !== JSON.stringify(value)) patch[key] = value;
      return;
    }
    if (before[key] === value) return;
    patch[key] = OPTIONAL_FIELDS.has(key) && value === '' ? null : value;
  });
  return patch;
}

const REQUIRED_FIELDS: KnownModelField[] = [
  'nameRu',
  'nameEn',
  'descRu',
  'descEn',
  'compositionRu',
  'compositionEn',
  'careRu',
  'careEn',
];

// Пустое обязательное поле сервер отобьёт (@NotBlank у StorefrontModelRequest) —
// не отправляем его вовсе: проверяем ТОЛЬКО то, что реально тронуто (patch), а
// не все десять полей разом — нетронутое поле уже прошло валидацию при
// последней публикации и трогать его незачем.
function blankRequiredFields(patch: Patch): KnownModelField[] {
  return REQUIRED_FIELDS.filter((field) => {
    const value = patch[field];
    return typeof value === 'string' && value.trim() === '';
  });
}

const FIELD_ERROR_TEXT: Record<KnownModelField, string> = {
  nameRu: 'Впишите название — не длиннее 255 символов.',
  nameEn: 'Впишите английское название — не длиннее 255 символов.',
  descRu: 'Впишите короткое описание.',
  descEn: 'Впишите короткое описание на английском.',
  compositionRu: 'Впишите состав.',
  compositionEn: 'Впишите состав на английском.',
  careRu: 'Впишите, как ухаживать за вещью.',
  careEn: 'Впишите уход на английском — как ухаживать за вещью.',
};

const EN_FIELDS_ID = 'wv-model-en-fields';

export default function ModelForm({modelId, onSaved}: {
  modelId: string;
  onSaved: () => void;
}) {
  const [before, setBefore] = useState<Draft | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<Partial<Record<KnownModelField, string>>>({});
  const [enOpen, setEnOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    // Переключение на другую модель без закрытия панели не размонтирует
    // ModelForm — меняется только modelId. Черновик сбрасываем СРАЗУ, а не
    // ждём ответа сети — тот же приём и та же причина, что у VariantForm: поля
    // не должны на мгновение показать чужую, ещё не подтверждённую карточку.
    setBefore(null);
    setDraft(null);
    setError(null);
    setServerFieldErrors({});
    apiFetch<ModelDto>(`/api/admin/storefront/models/${modelId}`)
      .then((model) => {
        if (!alive) return;
        const loaded = initial(model);
        setBefore(loaded);
        setDraft(loaded);
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'не прочиталось'));
    return () => {
      alive = false;
    };
  }, [modelId]);

  if (error && !draft) {
    return (
      <p role="alert" className="text-[12px] leading-snug" style={{color: SIGNAL}}>
        {error}
      </p>
    );
  }
  if (!draft || !before) {
    return (
      <p className="text-[12px]" style={{color: MUTED}}>
        читаю карточку…
      </p>
    );
  }

  const patch = patchOf(before, draft);
  const dirty = Object.keys(patch).length > 0;
  const blank = blankRequiredFields(patch);
  // Хотя бы один размер: без него сервер отобьёт весь черновик (@NotEmpty), а
  // карточка останется без кнопок размеров.
  const noSizes = draft.sizes.length === 0;
  const toggleSize = (size: string) =>
    setDraft((d) => (d ? {...d, sizes: ordered(d.sizes.includes(size) ? d.sizes.filter((s) => s !== size) : [...d.sizes, size])} : d));
  const shownSizes = ordered([...SIZE_ORDER, ...draft.sizes]);
  const blankSet = new Set(blank);
  const set = <K extends keyof Draft>(key: K) => (value: Draft[K]) => setDraft((d) => (d ? {...d, [key]: value} : d));
  // Пустое обязательное поле — своя, живая проверка (пересчитывается на каждый
  // ввод из patch выше), она всегда перекрывает то, что вернул сервер прошлым
  // разом: как только владелец сам исправил поле, старый отказ сервера — уже
  // неправда.
  const fieldError = (field: KnownModelField): string | undefined =>
    blankSet.has(field) ? FIELD_ERROR_TEXT[field] : serverFieldErrors[field];

  async function save() {
    setBusy(true);
    setError(null);
    setServerFieldErrors({});
    try {
      await saveModelDraft(modelId, patch);
      onSaved();
    } catch (e) {
      const {known, unknownFields} = classifyModelErrors(extractApiFieldErrors(e));
      if (known.size === 0 && unknownFields.length === 0) {
        // Ни одного известного поля — либо ответ вовсе не про валидацию (500,
        // сеть отвалилась), либо это не апифетчевая ошибка вовсе.
        setError(e instanceof Error ? e.message : 'не сохранилось');
      } else {
        const next: Partial<Record<KnownModelField, string>> = {};
        known.forEach((field) => {
          next[field] = FIELD_ERROR_TEXT[field];
        });
        setServerFieldErrors(next);
        if (unknownFields.length > 0) {
          // saveModelDraft валидирует ВЕСЬ StorefrontModelRequest, не только
          // тексты — отказ может прийти по полю, которого эта форма не рисует
          // (размеры, картинки, варианты). Молчать об этом нельзя.
          setError(
            unknownFields
              .map((field) => `Сервер отклонил значение поля «${field}» — эта форма его не показывает.`)
              .join(' '),
          );
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <TextField label="Название · ru" value={draft.nameRu} onChange={set('nameRu')} error={fieldError('nameRu')} />
      <TextField
        label="Короткое описание · ru"
        value={draft.descRu}
        onChange={set('descRu')}
        rows={2}
        error={fieldError('descRu')}
      />
      <TextField
        label="Подробно о вещи · ru"
        value={draft.storyRu}
        onChange={set('storyRu')}
        rows={5}
        hint="Необязательно — покупатель читает это ниже состава на странице товара."
      />
      <TextField
        label="Состав · ru"
        value={draft.compositionRu}
        onChange={set('compositionRu')}
        rows={2}
        error={fieldError('compositionRu')}
      />
      <TextField label="Уход · ru" value={draft.careRu} onChange={set('careRu')} rows={2} error={fieldError('careRu')} />

      <fieldset>
        <legend className="mb-2 text-[11px] uppercase tracking-[0.16em]" style={{color: MUTED}}>
          Размеры
        </legend>
        <div className="flex flex-wrap gap-2">
          {shownSizes.map((size) => {
            const on = draft.sizes.includes(size);
            return (
              <button
                key={size}
                type="button"
                aria-pressed={on}
                onClick={() => toggleSize(size)}
                className="min-h-[44px] min-w-[44px] px-3 text-[13px] transition-colors"
                style={{border: `1px solid ${on ? INK : HAIR}`, background: on ? INK : 'transparent', color: on ? '#fff' : MUTED}}
              >
                {size}
              </button>
            );
          })}
        </div>
        {noSizes && (
          <p role="alert" className="mt-2 text-[12px]" style={{color: SIGNAL}}>
            Выберите хотя бы один размер.
          </p>
        )}
      </fieldset>

      <div>
        {/* Сворачиваемый раздел, не отдельная кнопка-ссылка: зона нажатия и
            кегль — тот же порог 44px/13px, что у EditorButton, только своя
            разметка — этот переключатель на всю ширину панели и несёт
            aria-expanded, чего у EditorButton нет. */}
        <button
          type="button"
          onClick={() => setEnOpen((o) => !o)}
          aria-expanded={enOpen}
          aria-controls={EN_FIELDS_ID}
          className="flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-2 text-[13px] uppercase tracking-[0.14em] transition-colors"
          style={{border: `1px solid ${HAIR}`, color: INK}}
        >
          <span>Английские тексты</span>
          <span aria-hidden="true">{enOpen ? '−' : '+'}</span>
        </button>
        {/* hidden, а не условный рендер: узел остаётся в DOM для
            aria-controls, скрывает его нативный атрибут.
            hidden — ИМЕННО на этом, внешнем div, без своих display-классов:
            [hidden]{display:none} браузера и утилита flex — селекторы одной
            специфичности, и flex на том же узле забил бы hidden. Раскладка
            (flex flex-col gap-4) поэтому на вложенном div, а не тут. */}
        <div id={EN_FIELDS_ID} hidden={!enOpen}>
          <div className="mt-4 flex flex-col gap-4">
            <TextField label="Название · en" value={draft.nameEn} onChange={set('nameEn')} error={fieldError('nameEn')} />
            <TextField
              label="Короткое описание · en"
              value={draft.descEn}
              onChange={set('descEn')}
              rows={2}
              error={fieldError('descEn')}
            />
            <TextField
              label="Подробно о вещи · en"
              value={draft.storyEn}
              onChange={set('storyEn')}
              rows={5}
              hint="Необязательно."
            />
            <TextField
              label="Состав · en"
              value={draft.compositionEn}
              onChange={set('compositionEn')}
              rows={2}
              error={fieldError('compositionEn')}
            />
            <TextField label="Уход · en" value={draft.careEn} onChange={set('careEn')} rows={2} error={fieldError('careEn')} />
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-[12px] leading-snug" style={{color: SIGNAL}}>
          {error}
        </p>
      )}
      <EditorButton tone="solid" onClick={() => void save()} disabled={!dirty || busy || blank.length > 0 || noSizes}>
        {busy ? 'сохраняю…' : 'Сохранить в черновик'}
      </EditorButton>
    </div>
  );
}

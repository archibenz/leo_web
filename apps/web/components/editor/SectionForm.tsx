'use client';

import {useState} from 'react';
import type {StorefrontSection} from '../../lib/catalogue/types';
import {MUTED} from '../../app/[locale]/wv-palette';
import {EditorButton, MediaPairField, TextField} from './EditorFields';
import {saveSectionDraft, type Patch} from './editorApi';
import {useEditorFormState} from './useEditorFormState';

// Тексты и медиа блока главной. Уходит только тронутое: PUT принимает частичный
// патч и накапливает его поверх уже сохранённого черновика.

type Draft = {
  eyebrowRu: string;
  eyebrowEn: string;
  headlineRu: string;
  headlineEn: string;
  bodyRu: string;
  bodyEn: string;
  videoUrl: string | null;
  videoDesktopUrl: string | null;
  posterUrl: string | null;
  posterDesktopUrl: string | null;
};

function initial(section: StorefrontSection): Draft {
  return {
    eyebrowRu: section.eyebrowRu ?? '',
    eyebrowEn: section.eyebrowEn ?? '',
    headlineRu: section.headlineRu ?? '',
    headlineEn: section.headlineEn ?? '',
    bodyRu: section.bodyRu ?? '',
    bodyEn: section.bodyEn ?? '',
    videoUrl: section.videoUrl ?? null,
    videoDesktopUrl: section.videoDesktopUrl ?? null,
    posterUrl: section.posterUrl ?? null,
    posterDesktopUrl: section.posterDesktopUrl ?? null,
  };
}

// Пустая строка в тексте — это «снять подпись», то есть null, а не "".
// Пустое медиа — тоже null: снять постер это намерение, а не забытый ключ.
function patchOf(before: Draft, now: Draft): Patch {
  const patch: Patch = {};
  (Object.keys(now) as (keyof Draft)[]).forEach((key) => {
    if (before[key] === now[key]) return;
    const value = now[key];
    patch[key] = value === '' || value === null ? null : value;
  });
  return patch;
}

type Props = {section: StorefrontSection; onSaved: () => void};

export default function SectionForm(props: Props) {
  return <SectionFormFields key={props.section.id} {...props} />;
}

function SectionFormFields({section, onSaved}: Props) {
  const [before, setBefore] = useState(() => initial(section));
  const [draft, setDraft] = useState<Draft>(() => initial(section));
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const patch = patchOf(before, draft);
  const dirty = Object.keys(patch).length > 0;
  const uploading = Object.values(uploads).some(Boolean);
  useEditorFormState(dirty, busy || uploading, () => { setDraft(before); setError(null); });
  const set = <K extends keyof Draft>(key: K) => (value: Draft[K]) => setDraft((d) => ({...d, [key]: value}));
  const uploadState = (key: keyof Draft) => (pending: boolean) => setUploads((current) => ({...current, [key]: pending}));

  async function save() {
    if (!dirty || busy || uploading) return;
    setBusy(true);
    setError(null);
    const submitted = draft;
    try {
      await saveSectionDraft(section.id, patch);
      setBefore(submitted);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'не сохранилось');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <TextField label="Надзаголовок · ru" value={draft.eyebrowRu} onChange={set('eyebrowRu')} />
      <TextField label="Заголовок · ru" value={draft.headlineRu} onChange={set('headlineRu')} rows={2} />
      <TextField label="Текст · ru" value={draft.bodyRu} onChange={set('bodyRu')} rows={3} />
      <TextField label="Надзаголовок · en" value={draft.eyebrowEn} onChange={set('eyebrowEn')} />
      <TextField label="Заголовок · en" value={draft.headlineEn} onChange={set('headlineEn')} rows={2} />
      <TextField label="Текст · en" value={draft.bodyEn} onChange={set('bodyEn')} rows={3} />
      <p className="text-[11px] leading-snug" style={{color: MUTED}}>
        Перенос строки в заголовке — это перенос строки на витрине.
      </p>
      <MediaPairField
        label="Ролик"
        kind="video"
        phone={{value: draft.videoUrl ?? undefined, onChange: set('videoUrl'), onUploadingChange: uploadState('videoUrl')}}
        desktop={{value: draft.videoDesktopUrl ?? undefined, onChange: set('videoDesktopUrl'), onUploadingChange: uploadState('videoDesktopUrl')}}
      />
      <MediaPairField
        label="Кадр"
        kind="image"
        phone={{value: draft.posterUrl ?? undefined, onChange: set('posterUrl'), onUploadingChange: uploadState('posterUrl')}}
        desktop={{value: draft.posterDesktopUrl ?? undefined, onChange: set('posterDesktopUrl'), onUploadingChange: uploadState('posterDesktopUrl')}}
      />
      {error && (
        <p role="alert" className="text-[12px] leading-snug" style={{color: '#b4452f'}}>
          {error}
        </p>
      )}
      <EditorButton tone="solid" busy={busy} onClick={() => void save()} disabled={!dirty || busy || uploading}>
        {busy ? 'сохраняю…' : 'Сохранить в черновик'}
      </EditorButton>
    </div>
  );
}

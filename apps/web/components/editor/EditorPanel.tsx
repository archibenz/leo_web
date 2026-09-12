'use client';

import {useState} from 'react';
import {useMountTransition} from '../../lib/useMountTransition';
import {HAIR, INK, MUTED} from '../../app/[locale]/wv-palette';
import {useEditor} from './EditorProvider';
import {EditorButton} from './EditorFields';
import SectionForm from './SectionForm';
import VariantForm from './VariantForm';
import PublishList from './PublishList';

// Панель СБОКУ, а не модальное окно поверх. Владелец смотрит с телефона:
// модалка съела бы экран, и правку стало бы не с чем сверить. На широком
// экране это правая колонка, на телефоне — нижняя полка, страница над ней
// видна и прокручивается.

const DURATION = 220;

export default function EditorPanel() {
  const {editing, target, close, refresh} = useEditor();
  const [saved, setSaved] = useState(0);
  const {mounted, entered} = useMountTransition(editing && target !== null, DURATION);

  if (!mounted || !target) return null;

  const onSaved = () => {
    setSaved((n) => n + 1);
    // Перерисовка сервером: страница под панелью показывает уже сохранённый
    // черновик, собранный тем же слиянием, которым будет публиковать.
    refresh();
  };

  return (
    <aside
      aria-label="Правка витрины"
      className={`fixed z-[70] flex flex-col bg-white transition-transform duration-200 ease-out motion-reduce:transition-none
        inset-x-0 bottom-0 max-h-[62vh]
        lg:inset-y-0 lg:left-auto lg:right-0 lg:bottom-auto lg:h-full lg:max-h-none lg:w-[360px]
        ${entered ? 'translate-y-0 lg:translate-x-0' : 'translate-y-full lg:translate-y-0 lg:translate-x-full'}`}
      style={{borderTop: `1px solid ${HAIR}`, borderLeft: `1px solid ${HAIR}`, color: INK}}
    >
      <header className="flex items-start justify-between gap-3 px-4 py-3" style={{borderBottom: `1px solid ${HAIR}`}}>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em]" style={{color: MUTED}}>
            Правка
          </p>
          <p className="font-display text-[18px] font-light leading-tight">{target.label}</p>
        </div>
        <EditorButton tone="quiet" onClick={close}>
          Закрыть
        </EditorButton>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {target.kind === 'section' ? (
          <SectionForm section={target.section} onSaved={onSaved} />
        ) : (
          <VariantForm modelId={target.modelId} variantId={target.id} onSaved={onSaved} />
        )}

        <div className="mt-8 pt-4" style={{borderTop: `1px solid ${HAIR}`}}>
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em]" style={{color: MUTED}}>
            Что изменится при публикации
          </p>
          <PublishList reloadKey={saved} />
        </div>
      </div>
    </aside>
  );
}

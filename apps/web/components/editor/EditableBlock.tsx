'use client';

import type {ReactNode} from 'react';
import {HAIR, INK, SIGNAL} from '../../app/[locale]/wv-palette';
import {useEditor} from './EditorProvider';
import type {DraftKind, EditorTarget} from './types';

// Точка редактирования на живой странице. Вне режима — прозрачная обёртка:
// ни разметки, ни классов, ни обработчиков, чтобы покупатель получил ту же
// страницу, что и раньше.
//
// Кнопка и маркер стоят В ПОТОКЕ, над содержимым, а не absolute поверх него.
// Первый вариант был absolute — и на коротком блоке (цена — одна строка) ярлык
// накрывал ровно то число, которое владелец собрался править. Сдвиг вёрстки в
// режиме правки честнее, чем правка вслепую.
export default function EditableBlock({target, owner, children}: {
  target: EditorTarget;
  // Чей черновик стережёт маркер. У варианта это его МОДЕЛЬ: черновик варианта
  // лежит внутри модельного и ломается вместе с ним.
  owner: {kind: DraftKind; id: string};
  children: ReactNode;
}) {
  const {editing, target: current, open, brokenFor} = useEditor();
  if (!editing) return <>{children}</>;

  const active = current?.kind === target.kind && current.id === target.id;
  const broken = brokenFor(owner.kind, owner.id);

  return (
    <div style={{border: `1px dashed ${active ? SIGNAL : HAIR}`}}>
      <div className="wv-rise flex flex-wrap items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => open(target)}
          className="inline-flex items-center px-3 py-1.5 text-[10px] uppercase tracking-[0.16em]"
          style={{border: `1px solid ${active ? SIGNAL : INK}`, color: active ? SIGNAL : INK}}
        >
          {target.label}
        </button>
        {broken && (
          <p role="status" className="flex-1 text-[11px] leading-snug" style={{color: SIGNAL}}>
            Черновик этой карточки не читается — показано опубликованное. {broken.reason}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

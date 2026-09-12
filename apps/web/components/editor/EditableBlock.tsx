'use client';

import type {ReactNode} from 'react';
import {HAIR, INK, SIGNAL} from '../../app/[locale]/wv-palette';
import {useEditor} from './EditorProvider';
import type {DraftKind, EditorTarget} from './types';

// Точка редактирования на живой странице. Вне режима — прозрачная обёртка:
// ни разметки, ни классов, ни обработчиков, чтобы покупатель получил ту же
// страницу, что и раньше.
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
    <div className="relative">
      {children}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[30]"
        style={{border: `1px dashed ${active ? SIGNAL : HAIR}`}}
      />
      <button
        type="button"
        onClick={() => open(target)}
        className="wv-rise absolute left-3 top-3 z-[31] inline-flex items-center gap-2 bg-white/95 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] backdrop-blur-sm"
        style={{border: `1px solid ${active ? SIGNAL : INK}`, color: active ? SIGNAL : INK}}
      >
        {target.label}
      </button>
      {broken && (
        <p
          role="status"
          className="absolute inset-x-3 top-12 z-[31] bg-white/95 px-3 py-2 text-[11px] leading-snug backdrop-blur-sm"
          style={{border: `1px solid ${SIGNAL}`, color: SIGNAL}}
        >
          Черновик этой карточки не читается — показано опубликованное. {broken.reason}
        </p>
      )}
    </div>
  );
}

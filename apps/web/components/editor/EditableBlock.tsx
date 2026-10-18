'use client';

import {useEffect, useId, useRef, type ReactNode} from 'react';
import {sameEditorTarget, useEditor} from './EditorProvider';
import type {DraftKind, EditorTarget} from './types';
import styles from './EditorWorkspace.module.css';

export default function EditableBlock({target, owner, children}: {
  target: EditorTarget;
  owner: {kind: DraftKind; id: string};
  children: ReactNode;
}) {
  const {editing, target: selectedTarget, selectedRegion, open, brokenFor, registerEditable, unregisterEditable} = useEditor();
  const regionId = useId();
  const element = useRef<HTMLDivElement>(null);
  const currentTarget = useRef(target);
  currentTarget.current = target;

  useEffect(() => {
    if (!editing) return;
    registerEditable({id: regionId, label: target.label, owner: {kind: owner.kind, id: owner.id},
      getTarget: () => currentTarget.current, getElement: () => element.current});
    return () => unregisterEditable(regionId);
  }, [editing, regionId, target.label, owner.kind, owner.id, registerEditable, unregisterEditable]);

  if (!editing) return <>{children}</>;
  const active = selectedRegion === regionId && sameEditorTarget(selectedTarget, target);
  const broken = brokenFor(owner.kind, owner.id);

  return <div ref={element} data-editable="true" data-editor-select="" data-selected={active}
    className={styles.region} tabIndex={0} role="group" aria-label={target.label}
    onClickCapture={(event) => {
      event.preventDefault();
      event.stopPropagation();
      open(target, regionId);
    }}
    onKeyDown={(event) => {
      if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      open(target, regionId);
    }}>
    <span aria-hidden="true" className={styles.regionLabel}>{target.label}</span>
    {broken && <p role="status" className={styles.broken}>Черновик этой карточки не читается — показано опубликованное. {broken.reason}</p>}
    {children}
  </div>;
}

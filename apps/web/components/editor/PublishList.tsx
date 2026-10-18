'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {HAIR, MUTED, SIGNAL} from '../../app/[locale]/wv-palette';
import {EditorButton} from './EditorFields';
import {discard, listDrafts, publish, type DraftSummary} from './editorApi';
import {useEditor} from './EditorProvider';
import {workspaceCopy} from './workspaceCopy';

// «Что именно изменится» — список полей, который отдаёт сама ручка черновиков.
// Не собираем его на клиенте: тот же список проверяет публикация, и вторая
// сборка рано или поздно разошлась бы с первой.

const KIND_LABEL: Record<DraftSummary['kind'], string> = {
  section: 'Блок',
  model: 'Карточка',
  set: 'Образ',
};

export default function PublishList({reloadKey}: {reloadKey: number}) {
  const {refresh, brokenDrafts, locale, regions, formState, operationBusy, setOperationBusy, clearDiscardedTarget} = useEditor();
  const copy = workspaceCopy(locale);
  const [drafts, setDrafts] = useState<DraftSummary[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  const reload = useCallback(async () => {
    const generation = ++request.current;
    setError(null);
    try {
      const result = await listDrafts();
      if (generation === request.current) setDrafts(result);
    } catch (e) {
      if (generation === request.current) setError(e instanceof Error ? e.message : 'не прочиталось');
    }
  }, []);

  const invalidate = useCallback(() => {request.current++;}, []);
  useEffect(() => {
    void reload();
    return invalidate;
  }, [reload, reloadKey, invalidate]);

  async function run(action: 'publish' | 'discard', row: DraftSummary) {
    if (busy !== null || formState.busy || formState.dirty || operationBusy) return;
    if (action === 'discard' && !window.confirm(copy.discardSavedConfirm)) return;
    setBusy(`${action}:${row.id}`);
    setOperationBusy(true);
    setError(null);
    try {
      await (action === 'publish' ? publish(row.kind, row.id) : discard(row.kind, row.id));
      if (action === 'discard') clearDiscardedTarget(row.kind, row.id);
      refresh();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'не получилось');
    } finally {
      setBusy(null);
      setOperationBusy(false);
    }
  }

  if (drafts === null && !error) {
    return (
      <p className="text-[12px]" style={{color: MUTED}}>
        смотрю, что не опубликовано…
      </p>
    );
  }

  if (drafts && drafts.length === 0 && !error) {
    return (
      <p className="text-[12px]" style={{color: MUTED}}>
        Неопубликованных правок нет.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {formState.dirty && <p className="text-[13px] leading-relaxed" style={{color: MUTED}}>{copy.finishLocalFirst}</p>}
      {error && (
        <p role="alert" className="text-[12px] leading-snug" style={{color: SIGNAL}}>
          {error}
        </p>
      )}
      {(drafts ?? []).map((row) => {
        const broken = brokenDrafts.find((b) => b.kind === row.kind && b.id === row.id);
        return (
          <div key={`${row.kind}:${row.id}`} className="pb-3" style={{borderBottom: `1px solid ${HAIR}`}}>
            <p className="text-[11px] uppercase tracking-[0.16em]">
              {KIND_LABEL[row.kind]} · {regions.find((region) => region.owner.kind === row.kind && region.owner.id === row.id)?.label ?? row.key}
            </p>
            <p className="mt-1 break-words text-[12px]" style={{color: MUTED}}>
              {row.fields.map((field) => copy.fieldNames[field as keyof typeof copy.fieldNames] ?? field).join(', ')}
            </p>
            {broken && (
              <p role="status" className="mt-1 text-[11px] leading-snug" style={{color: SIGNAL}}>
                Черновик не читается — опубликовать его нельзя. {broken.reason}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {/* Публикация выключена там, где в сантиметре от кнопки написано
                  «опубликовать нельзя». Сервер отказ держит и без этого, но
                  самая опасная кнопка не должна спорить с собственной подписью. */}
              <EditorButton tone="solid" busy={busy === `publish:${row.id}`} disabled={busy !== null || formState.busy || formState.dirty || operationBusy || broken !== undefined} onClick={() => void run('publish', row)}>
                {busy === `publish:${row.id}` ? 'публикую…' : 'Опубликовать'}
              </EditorButton>
              <EditorButton tone="signal" busy={busy === `discard:${row.id}`} disabled={busy !== null || formState.busy || formState.dirty || operationBusy} onClick={() => void run('discard', row)}>
                {busy === `discard:${row.id}` ? 'отменяю…' : copy.discardSaved}
              </EditorButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}

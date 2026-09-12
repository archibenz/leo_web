'use client';

import {useCallback, useEffect, useState} from 'react';
import {HAIR, MUTED, SIGNAL} from '../../app/[locale]/wv-palette';
import {EditorButton} from './EditorFields';
import {discard, listDrafts, publish, type DraftSummary} from './editorApi';
import {useEditor} from './EditorProvider';

// «Что именно изменится» — список полей, который отдаёт сама ручка черновиков.
// Не собираем его на клиенте: тот же список проверяет публикация, и вторая
// сборка рано или поздно разошлась бы с первой.

const KIND_LABEL: Record<DraftSummary['kind'], string> = {
  section: 'Блок',
  model: 'Карточка',
  set: 'Образ',
};

export default function PublishList({reloadKey}: {reloadKey: number}) {
  const {refresh, brokenDrafts} = useEditor();
  const [drafts, setDrafts] = useState<DraftSummary[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    listDrafts()
      .then(setDrafts)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'не прочиталось'));
  }, []);

  useEffect(reload, [reload, reloadKey]);

  async function run(action: 'publish' | 'discard', row: DraftSummary) {
    setBusy(`${action}:${row.id}`);
    setError(null);
    try {
      await (action === 'publish' ? publish(row.kind, row.id) : discard(row.kind, row.id));
      reload();
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'не получилось');
    } finally {
      setBusy(null);
    }
  }

  if (drafts === null && !error) {
    return (
      <p className="text-[12px]" style={{color: MUTED}}>
        смотрю, что не опубликовано…
      </p>
    );
  }

  if (drafts && drafts.length === 0) {
    return (
      <p className="text-[12px]" style={{color: MUTED}}>
        Неопубликованных правок нет.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
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
              {KIND_LABEL[row.kind]} · {row.key}
            </p>
            <p className="mt-1 break-words text-[12px]" style={{color: MUTED}}>
              {row.fields.join(', ')}
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
              <EditorButton tone="solid" disabled={busy !== null || broken !== undefined} onClick={() => void run('publish', row)}>
                {busy === `publish:${row.id}` ? 'публикую…' : 'Опубликовать'}
              </EditorButton>
              <EditorButton tone="signal" disabled={busy !== null} onClick={() => void run('discard', row)}>
                {busy === `discard:${row.id}` ? 'отменяю…' : 'Отменить черновик'}
              </EditorButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}

'use client';

import Link from 'next/link';
import {HAIR, INK, SIGNAL} from '../../app/[locale]/wv-palette';
import {useEditorSession} from './useEditorSession';
import {useEditHrefs} from './editHrefs';

// Вход в режим — в шапке витрины и только у владельца.
//
// Кнопка ничего не охраняет: спрятать её — не защита. Черновик отдаёт ручка
// под ROLE_ADMIN, и посторонний, открывший ?edit=1 прямой ссылкой, получит
// опубликованную витрину, потому что черновых данных ему просто не дадут.
export default function EditorToggle() {
  const {isAdmin} = useEditorSession();
  const {wantsEdit, editHref, plainHref} = useEditHrefs();
  if (!isAdmin) return null;

  // Виден и на телефоне: владелец смотрит сайт именно с него.
  return (
    <Link
      href={wantsEdit ? plainHref : editHref}
      aria-pressed={wantsEdit}
      className="wv-rise ml-1 inline-flex shrink-0 items-center px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] transition-colors sm:px-2.5 sm:tracking-[0.16em]"
      style={{border: `1px solid ${wantsEdit ? SIGNAL : HAIR}`, color: wantsEdit ? SIGNAL : INK}}
    >
      {wantsEdit ? 'Выйти' : 'Править'}
    </Link>
  );
}

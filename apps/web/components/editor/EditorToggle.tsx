'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {HAIR, INK, SIGNAL} from '../../app/[locale]/wv-palette';
import {useEditorSession} from './useEditorSession';
import {useEditHrefs} from './editHrefs';
import {supportsEditing} from './supportedRoutes';

// Вход в режим — в шапке витрины и только у владельца.
//
// Кнопка ничего не охраняет: спрятать её — не защита. Черновик отдаёт ручка
// под ROLE_ADMIN, и посторонний, открывший ?edit=1 прямой ссылкой, получит
// опубликованную витрину, потому что черновых данных ему просто не дадут.
//
// Слово «Выйти» здесь запрещено: оно занято выходом из аккаунта
// (`white.account.signOut`, `header.dropdown.logOut`). Два разных действия под
// одним словом в полутора сантиметрах друг от друга — владелец нажмёт не то и
// решит, что редактор его разлогинил.
export default function EditorToggle() {
  const {isAdmin} = useEditorSession();
  const {wantsEdit, editHref, plainHref} = useEditHrefs();
  const pathname = usePathname();
  // Переключатель живёт в чроме, то есть на всех страницах витрины, а правка —
  // только на тех, где расставлены её точки. Обещать режим там, где он молча не
  // включится, хуже, чем не показывать кнопку: владелец правил бы опубликованное,
  // считая, что правит черновик.
  if (!isAdmin || !supportsEditing(pathname)) return null;

  // Вход виден на любой ширине: владелец смотрит сайт с телефона.
  //
  // ВЫХОД на телефоне из шапки убран. «Закончить правку» — 136 px, и рядом с
  // маркой на 390 они выдавливают из шапки избранное. Терять при этом нечего:
  // полоса режима стоит прямо под шапкой и несёт ту же ссылку теми же словами.
  // На широком экране места хватает — там остаются обе.
  return (
    <Link
      href={wantsEdit ? plainHref : editHref}
      aria-pressed={wantsEdit}
      className={`wv-rise ml-1 shrink-0 items-center px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] transition-colors sm:px-2.5 sm:tracking-[0.16em] ${
        wantsEdit ? 'hidden sm:inline-flex' : 'inline-flex'
      }`}
      style={{border: `1px solid ${wantsEdit ? SIGNAL : HAIR}`, color: wantsEdit ? SIGNAL : INK}}
    >
      {wantsEdit ? 'Закончить правку' : 'Править'}
    </Link>
  );
}

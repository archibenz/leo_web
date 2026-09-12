'use client';

import Link from 'next/link';
import {FOOT, HAIR, INK, SIGNAL} from '../../app/[locale]/wv-palette';
import {useEditorSession} from './useEditorSession';
import {useEditHrefs} from './editHrefs';

// Полоса под шапкой: чем страница сейчас является. Без неё режим отличается от
// обычной витрины только рамками вокруг блоков, и с телефона это не читается.
//
// Выход из режима НЕ называется «Выйти»: так называется выход из аккаунта
// (`white.account.signOut`). На телефоне эти два слова оказывались в полутора
// сантиметрах друг от друга.
//
// Второй случай важнее первого: флаг в адресе стоит, владелец — админ, а
// сервер черновик не отдал (cookie сессии протухла). Молчать здесь нельзя: он
// будет править опубликованное, считая, что правит черновик.
export default function EditorNotice({editing}: {editing: boolean}) {
  const {isAdmin} = useEditorSession();
  const {wantsEdit, plainHref} = useEditHrefs();

  if (editing) {
    return (
      <div
        className="wv-rise flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-[11px] uppercase tracking-[0.16em]"
        style={{background: FOOT, borderBottom: `1px solid ${HAIR}`, color: INK}}
      >
        <span>Режим правки · страница показывает черновик</span>
        <Link href={plainHref} className="underline underline-offset-4">
          Закончить правку
        </Link>
      </div>
    );
  }

  if (wantsEdit && isAdmin) {
    return (
      <div
        role="alert"
        className="px-4 py-2 text-[11px] leading-snug"
        style={{background: FOOT, borderBottom: `1px solid ${SIGNAL}`, color: SIGNAL}}
      >
        Сервер не признал сессию — страница показывает опубликованное, а не черновик. Войдите заново.
      </div>
    );
  }

  return null;
}

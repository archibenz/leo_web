'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {FOOT, HAIR, INK, SIGNAL} from '../../app/[locale]/wv-palette';
import {useEditorSession} from './useEditorSession';
import {useEditHrefs} from './editHrefs';
import {writeEditCookie} from './editCookie';

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
  const router = useRouter();

  // Раньше ссылка только снимала ?edit=1 из адреса — этого хватало, пока
  // режим и жил исключительно в адресе. Теперь у него есть второй, стойкий
  // источник — кука выключателя (components/editor/EditModeSwitch.tsx), и её
  // эта навигация не тронет сама: без явного снятия режим включился бы снова
  // на следующей загрузке той же страницы.
  const finishEditing = () => {
    writeEditCookie(false);
    // Если в адресе не было ?edit=1 (вошли только по куке), Link ведёт на
    // тот же URL — без refresh() страница осталась бы показывать черновик до
    // следующего перехода, потому что сама по себе такая навигация — no-op.
    router.refresh();
  };

  if (editing) {
    return (
      <div
        className="wv-rise flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-[11px] uppercase tracking-[0.16em]"
        style={{background: FOOT, borderBottom: `1px solid ${HAIR}`, color: INK}}
      >
        <span>Режим правки · страница показывает черновик</span>
        <Link href={plainHref} onClick={finishEditing} className="underline underline-offset-4">
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

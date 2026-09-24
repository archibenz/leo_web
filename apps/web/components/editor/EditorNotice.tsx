'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {FOOT, HAIR, INK, SIGNAL} from '../../app/[locale]/wv-palette';
import {useEditor} from './EditorProvider';
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
// Второй случай важнее первого: хотели черновик (параметром или кукой —
// wantsEdit уже решил storefrontForViewer), владелец — админ, а сервер
// черновик не отдал (сессия протухла или её не было). Молчать здесь нельзя:
// он будет считать, что смотрит черновик, или решит, что выключатель сломан.
//
// wantsEdit — ПРОП, не свой хук: сервер уже знает оба намерения (параметр и
// куку) и обязан передать решение вниз через EditorProvider, как передаёт
// editing и brokenDrafts. Читать document.cookie здесь же значило бы
// разойтись с серверной разметкой на первом рендере — гидратационная
// рассинхронизация, которую на этой витрине уже ловили.
// «3 области» / «1 область» / «5 областей». ICU-множественного здесь нет
// (полоса живёт вне словаря, как и остальной текст режима правки), а
// неправильное окончание в числе, которое владелец читает каждый раз, —
// мелочь ровно до второго раза.
function областей(n: number): string {
  const сотня = n % 100;
  const единица = n % 10;
  if (сотня >= 11 && сотня <= 14) return 'областей';
  if (единица === 1) return 'область';
  if (единица >= 2 && единица <= 4) return 'области';
  return 'областей';
}

// readOnly — узкий экран (useIsDesktop.ts): правка там выключена, но сервер
// ширины не знает и по куке всё равно отдаёт черновик. Молчать нельзя —
// неопубликованное прочтётся как сайт. Поэтому полоса остаётся, но без числа
// областей и со словами «править можно с компьютера»; выход — тот же.
export default function EditorNotice({editing, wantsEdit, readOnly = false}: {
  editing: boolean;
  wantsEdit: boolean;
  readOnly?: boolean;
}) {
  const {isAdmin} = useEditorSession();
  const {editableCount} = useEditor();

  // ЖДЁМ, ПОКА ТОЧКИ УСПЕЮТ ОТМЕТИТЬСЯ, и это единственное место, где мы
  // ждём времени, а не следствия. Причина названа честно: мы ждём ОТСУТСТВИЯ,
  // а у отсутствия нет события. Точки правки отмечаются в эффектах, то есть
  // после первой отрисовки; до неё ноль означает «ещё не считали», а не «нечего
  // править», и сказать «нечего править» на этом кадре было бы неправдой.
  //
  // Поэтому до конца текущего кадра полоса говорит нейтральное, а числом или
  // словом «нечего» отвечает только тогда, когда ответ уже не изменится.
  const [сосчитано, setСосчитано] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setСосчитано(true), 0);
    return () => clearTimeout(t);
  }, []);
  const {plainHref} = useEditHrefs();
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

  if (editing && readOnly) {
    return (
      <div
        data-edit-bar="full"
        data-edit-readonly=""
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-[11px] uppercase tracking-[0.16em]"
        style={{background: FOOT, borderBottom: `1px solid ${HAIR}`, color: INK}}
      >
        <span>Черновик · править можно с компьютера</span>
        <Link
          href={plainHref}
          onClick={finishEditing}
          className="inline-flex min-h-11 items-center px-3 text-[13px] underline underline-offset-4"
        >
          Закончить правку
        </Link>
      </div>
    );
  }

  if (editing) {
    return (
      <div
        data-edit-bar="full"
        className="wv-rise flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-[11px] uppercase tracking-[0.16em]"
        style={{background: FOOT, borderBottom: `1px solid ${HAIR}`, color: INK}}
      >
        {/* ЧИСЛО НА ЭКРАНЕ, А НЕ В СПРАВКЕ. Правится шесть областей на весь
            сайт; подсветка делает это видимым за секунду, и первый вопрос
            владельца — «почему только тут». Число отвечает на него ДО вопроса.
            Ноль назван словами: режим, который включается и ничего не делает,
            читается как поломка. */}
        <span>
          {editableCount > 0
            ? `Режим правки · правится ${editableCount} ${областей(editableCount)}`
            : сосчитано
              ? 'Режим правки · на этой странице пока нечего править'
              : 'Режим правки · страница показывает черновик'}
        </span>
        {/* 44px/13px, и это не та же мера, что у кнопок входа, — она важнее.
            Промах по входу означает «не вошёл, нажму ещё раз». Промах по
            ВЫХОДУ означает «застрял в режиме правки», а это читается как
            «сайт сломался». Замер 15.09 дал здесь 17 px — худшее на экране. */}
        <Link
          href={plainHref}
          onClick={finishEditing}
          className="inline-flex min-h-11 items-center px-3 text-[13px] underline underline-offset-4"
        >
          Закончить правку
        </Link>
      </div>
    );
  }

  if (wantsEdit && isAdmin) {
    return (
      <div
        role="alert"
        data-edit-bar="full"
        className="px-4 py-2 text-[11px] leading-snug"
        style={{background: FOOT, borderBottom: `1px solid ${SIGNAL}`, color: SIGNAL}}
      >
        Сервер не признал сессию — страница показывает опубликованное, а не черновик. Войдите заново.
      </div>
    );
  }

  return null;
}

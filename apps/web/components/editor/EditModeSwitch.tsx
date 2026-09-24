'use client';

import {useTranslations} from 'next-intl';
import {useEditMode} from './useEditMode';
import {useIsDesktop} from './useIsDesktop';

// Персистентный вход в режим правки: страница аккаунта и низ админки, один
// компонент на оба места (владелец сам назвал оба). Раньше вход жил в шапке
// как ссылка, менявшая ?edit=1, — теперь это выключатель, ставящий и
// снимающий куку rl_edit, чтобы режим пережил переход между страницами.
// ?edit=1 никуда не делся: им по-прежнему пользуются ссылки редактора и
// спеки — см. lib/catalogue/viewer.ts, где оба условия сходятся через ИЛИ.
//
// Красится цветом окружающего текста (currentColor), а не палитрой одной из
// витрин: на аккаунте фон белый, в админке — тёмный, и зашитый под один из
// них цвет на другом стал бы нечитаемым.
// `framed` по умолчанию true — ровно то поведение, что было: своя черта
// сверху и свой отступ. Так компонент выглядит внизу админской панели
// (app/[locale]/(admin)/admin/page.tsx), где вокруг него ничего нет.
//
// На странице аккаунта рамку берёт на себя вызывающий: там переключатель
// стоит внутри общего блока «Управление сайтом», и вторая черта поверх
// рамки блока давала бы двойную линию. Отступы страницы принадлежат
// странице, а не компоненту, который живёт в двух разных местах.
export default function EditModeSwitch({framed = true}: {framed?: boolean} = {}) {
  // Кука, право и router.refresh() — в useEditMode: тот же режим включает
  // пункт боковой панели админки, и две копии этой логики разъехались бы.
  const {isAdmin, on, toggle} = useEditMode();
  const desktop = useIsDesktop();
  const t = useTranslations('white.editModeSwitch');

  // Правка — только на компьютере (useIsDesktop.ts): на телефоне выключателя нет.
  if (!isAdmin || !desktop) return null;

  return (
    <div
      className={framed ? 'mt-10 pt-6' : ''}
      style={framed ? {borderTop: '1px solid currentColor'} : undefined}
    >
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={toggle}
        className="flex min-h-12 w-full items-center justify-between gap-3 text-left text-[13px] uppercase tracking-[0.12em]"
      >
        <span>{t('label')}</span>
        <span
          aria-hidden="true"
          className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full"
          style={{border: '1px solid currentColor'}}
        >
          <span
            className="inline-block h-4 w-4 rounded-full transition-transform"
            style={{
              transform: on ? 'translateX(22px)' : 'translateX(2px)',
              background: on ? 'currentColor' : 'transparent',
              border: on ? 'none' : '1px solid currentColor',
            }}
          />
        </span>
      </button>
    </div>
  );
}

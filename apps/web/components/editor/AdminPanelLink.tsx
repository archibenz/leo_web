'use client';

import {useTranslations} from 'next-intl';
import {useEditorSession} from './useEditorSession';

// Ссылка на /admin, рядом с выключателем режима правки на странице аккаунта —
// владелец правил бегущую строку через выключатель тем же днём (isAdmin у
// него уже работал), но саму панель редактирования карточек/коллекций не
// нашёл: ссылки на неё не было нигде на витрине, только руками в адресной
// строке.
//
// Отдельный компонент, не расширение EditModeSwitch — тот же переключатель
// стоит ещё и внизу самой админки («владелец сам назвал оба места» —
// EditModeSwitch.tsx), и там ссылка на себя же не нужна.
//
// currentColor, не палитра одной из витрин — тот же приём и по той же
// причине, что у EditModeSwitch рядом: компонент не должен знать, тёмный
// фон вокруг него или светлый.
export default function AdminPanelLink({locale}: {locale: string}) {
  const {isAdmin} = useEditorSession();
  const t = useTranslations('white.editModeSwitch');

  if (!isAdmin) return null;

  // Владелец про прежний вид: «сделай нормальное расположение кнопок и
  // размерности». На снимке «АДМИН-ПАНЕЛЬ» стояла голым подчёркнутым текстом
  // сразу под чертой переключателя — по виду подпись, а не то, на что
  // нажимают, хотя это главный вход в инструмент.
  //
  // Теперь это рамка во всю ширину: на телефоне попасть пальцем можно в любом
  // месте строки, а не в три слова. Высота 48px против прежних 44 — ровно как
  // у строк меню аккаунта выше, чтобы блок читался одним столбцом.
  //
  // Рамка и текст — currentColor, не палитра: компонент по-прежнему не должен
  // знать, тёмный вокруг фон или светлый.
  return (
    <a href={`/${locale}/admin`} className={OWNER_LINK} style={OWNER_LINK_STYLE}>
      {t('adminLink')}
    </a>
  );
}

export const OWNER_LINK =
  'mt-3 flex min-h-12 w-full items-center justify-center rounded-[2px] px-4 text-center text-[13px] uppercase tracking-[0.12em] transition-opacity hover:opacity-70';
export const OWNER_LINK_STYLE = {color: 'currentColor', border: '1px solid currentColor'} as const;

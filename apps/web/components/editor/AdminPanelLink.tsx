'use client';

import {useTranslations} from 'next-intl';
import {useEditorSession} from './useEditorSession';
import {Button} from '../ui/button';

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
    <Button asChild variant="owner" size="owner" className="mt-3 w-full justify-between text-left" style={OWNER_LINK_STYLE}>
      <a href={`/${locale}/admin`}>
        <span>{t('adminLink')}</span>
      </a>
    </Button>
  );
}

export const OWNER_LINK_STYLE = {color: 'currentColor', border: '1px solid currentColor'} as const;

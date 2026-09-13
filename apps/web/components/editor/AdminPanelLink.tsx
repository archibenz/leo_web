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

  return (
    <a
      href={`/${locale}/admin`}
      className="wv-link mt-4 inline-flex min-h-11 items-center text-[13px] uppercase tracking-[0.12em]"
      style={{color: 'currentColor'}}
    >
      <span className="wv-link-ink">{t('adminLink')}</span>
    </a>
  );
}

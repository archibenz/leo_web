'use client';

import {useTranslations} from 'next-intl';
import {useEditorSession} from './useEditorSession';
import EditModeSwitch from './EditModeSwitch';
import AdminPanelLink from './AdminPanelLink';

// Владелец про прежний экран аккаунта: «сделай нормальное расположение кнопок
// и размерности».
//
// Было так: переключатель правки приносил свою черту во всю ширину и отступ
// mt-10, ссылка на админку шла следом с mt-4 голым подчёркнутым текстом, а
// «Выйти» висело между списком ссылок и этой парой. Ритм по странице получался
// 12 / 3 / 10 / 10+6 / 4 — пять разных величин подряд, и глазу не за что
// зацепиться. Плюс черта переключателя рисовалась currentColor, то есть почти
// чёрным, тогда как все прочие линии страницы — волосяные HAIR.
//
// Здесь оба органа собраны в ОДИН блок с подписью, устроенный ровно как список
// ссылок выше: подпись 11px в разрядку, рамка волосяной линией, строки по 48px.
// Страница читается одним столбцом, а не набором обрезков.
//
// Отдельный компонент, а не разметка внутри страницы аккаунта, по одной
// причине: гейт должен быть ОДИН. Если подпись «Управление сайтом» и рамку
// рисовать на странице, а внутренности прятать по isAdmin, посторонний увидит
// пустую рамку с подписью — то есть узнает о существовании инструмента ровно
// то, что мы прятали.
export default function OwnerTools({locale}: {locale: string}) {
  const {isAdmin} = useEditorSession();
  const t = useTranslations('white.editModeSwitch');

  if (!isAdmin) return null;

  return (
    <div className="mt-10">
      <p className="text-[11px] uppercase tracking-[0.2em] opacity-60">{t('sectionLabel')}</p>
      {/* Рамка и разделитель — currentColor с прозрачностью, а не HAIR из
          палитры витрины: блок обязан оставаться читаемым и на тёмном фоне,
          как и оба его содержимых. Прозрачность даёт волосяную линию на
          светлом и на тёмном одинаково, чего фиксированный цвет не умеет. */}
      <div
        className="mt-3 border-y"
        style={{borderColor: 'color-mix(in srgb, currentColor 18%, transparent)'}}
      >
        <EditModeSwitch framed={false} />
      </div>
      <AdminPanelLink locale={locale} />
    </div>
  );
}

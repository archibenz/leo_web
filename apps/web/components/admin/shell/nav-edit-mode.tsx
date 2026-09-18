'use client';

import {useTranslations} from 'next-intl';
import {PencilIcon, PencilOffIcon} from 'lucide-react';
import {SidebarMenu, SidebarMenuItem} from '@/components/ui/sidebar';
import {CustomMenuButton} from './app-shared';
import {useEditMode} from '@/components/editor/useEditMode';

// Режим правки пунктом боковой панели — владелец просил убрать его с дашборда
// и положить в меню.
//
// ЭТО ПЕРЕКЛЮЧАТЕЛЬ, А НЕ ССЫЛКА, И ЭТО ОБЯЗАНО БЫТЬ ВИДНО. Ряд, неотличимый
// от соседних пунктов, обещает переход: нажал — ждёшь страницу, а он молча
// включает режим. Поэтому состояние показано ТРЕМЯ способами сразу, и каждый
// нужен своему случаю:
//
//   role="switch" + aria-checked  читалке — она произносит «включено»
//   значок карандаша: целый / перечёркнутый  свёрнутой панели, где подписи нет
//   слово «включена» в подписи   развёрнутой панели, без наведения
//
// Значок меняется не ради красоты: в свёрнутом виде от пункта остаётся ровно
// он, и по нему одному должно быть понятно, включено или нет. Ту же беду мы
// уже ловили, когда в свёрнутой панели оставалось «REI» вместо марки.
//
// Отметка «включено» рисуется тем же приёмом, что «текущий раздел» —
// isActive: черта слева и жирнее шрифт. Своего вида не заводим, чтобы в одной
// панели не было двух разных способов сказать «вот это сейчас действует».
export function NavEditMode() {
  const t = useTranslations('admin');
  const {isAdmin, on, toggle} = useEditMode();

  // Право решает сервер (useEditorSession → /api/auth/me). Не владелец —
  // пункта нет вовсе, как и прежнего блока на дашборде.
  if (!isAdmin) return null;

  const подпись = on ? t('editModeOn') : t('editModeOff');

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <CustomMenuButton
          isActive={on}
          tooltip={подпись}
          onClick={toggle}
          role="switch"
          aria-checked={on}
        >
          {on ? <PencilIcon /> : <PencilOffIcon />}
          <span className="text-[15px]">{подпись}</span>
        </CustomMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {useEditorSession} from './useEditorSession';
import {readEditCookie, writeEditCookie} from './editCookie';

// Режим правки — одна правда на два места. Выключатель живёт и на странице
// аккаунта (EditModeSwitch), и пунктом в боковой панели админки
// (components/admin/shell/nav-edit-mode.tsx), а вид у них разный: там строка
// с ползунком, здесь ряд меню со значком.
//
// Логику вынесли, а не скопировали: две копии куки и router.refresh()
// разъезжаются молча — правят одну, вторая продолжает вести себя по-старому.
export function useEditMode(): {isAdmin: boolean; on: boolean; toggle: () => void} {
  const {isAdmin} = useEditorSession();
  const router = useRouter();
  const [on, setOn] = useState(false);

  // Кука — источник правды для стартового состояния: пришли на страницу уже
  // включёнными (переход после аккаунта) — выключатель обязан показать это,
  // а не сброситься в «выключено» до первого нажатия.
  useEffect(() => {
    setOn(readEditCookie());
  }, []);

  const toggle = () => {
    const next = !on;
    writeEditCookie(next);
    setOn(next);
    // Решает сервер заново (lib/catalogue/viewer.ts), не состояние здесь —
    // refresh() ещё и сбрасывает Router Cache: без этого уже посещённые
    // страницы отдали бы навигацией старый снимок без черновика.
    router.refresh();
  };

  return {isAdmin, on, toggle};
}

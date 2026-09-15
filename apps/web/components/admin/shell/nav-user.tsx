'use client';

import Link from 'next/link';
import {useTranslations} from 'next-intl';
import {Avatar, AvatarFallback} from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {ExternalLinkIcon, LogOutIcon, UserIcon} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';

// В блоке Efferd здесь лежал выдуманный человек: имя, почта и аватар с чужого
// GitHub, плюс пункты «Plan & Billing» и «Settings», которых у нас нет. Всё
// заменено на настоящее.
//
// ПОЛЬЗОВАТЕЛЬ БЕРЁТСЯ ИЗ AuthContext, А НЕ ИЗ useWhiteAuth — И ЭТО НЕ ВКУС.
// Обёртка админского раздела поднимает AuthProvider, то есть он смонтирован и
// УЖЕ сходил за `/api/auth/me`. Позови я здесь витринный хук, на каждой
// странице админки уходило бы ДВА обращения к одной ручке против лимита в
// десять в минуту — ровно та беда, которую мы сегодня чинили на странице
// аккаунта. Источник правды на странице должен быть один.
//
// Аватар — буква, а не картинка: изображения профиля у нас нет ни в базе, ни в
// ответе `/api/auth/me`. Тянуть заглушку с внешнего адреса значило бы отдавать
// почту владельца стороннему сервису на каждой загрузке админки.
//
// Пунктов три, и каждый ведёт туда, куда владелец действительно ходит:
// на сайт, в свой аккаунт и выход.
export function NavUser({locale}: {locale: string}) {
  const t = useTranslations('admin');
  const {user, logout} = useAuth();

  const name = user?.name ?? '';
  const initial = (name || user?.email || '?').trim().charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      {/* Зона нажатия 44 px на телефоне при кружке в 32 — тот же приём и тот
          же порог, что у CustomSidebarTrigger рядом. Кружок остаётся мелким
          нарочно: он опознавательный знак, а не кнопка на пол-шапки; палец
          при этом попадает по площади, а не по рисунку.

          До 15.09 зоной был сам кружок, 32 px. Нашлось это не глазом: спека
          16 краснела на «тумблере», а ловила эту кнопку — единственную на
          экране с aria-expanded. Мы выкатили оболочку с нарушением того
          самого порога, который в тот же день чинили в редакторе. */}
      <DropdownMenuTrigger
        aria-label={name || t('myAccount')}
        className="flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring md:size-9"
      >
        <Avatar className="size-8">
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        {user && (
          <>
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar className="size-10">
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">{name}</div>
                <div className="truncate text-muted-foreground text-xs">{user.email}</div>
              </div>
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={`/${locale}`}>
              <ExternalLinkIcon />
              {t('toSite')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/${locale}/account`}>
              <UserIcon />
              {t('myAccount')}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="w-full cursor-pointer"
          variant="destructive"
          onSelect={() => {
            // logout() у AuthContext асинхронный (он ещё и гасит куку на
            // бэкенде), но ждать его здесь нечего: страницы админки уже
            // отрисованы и лежат в кэше роутера. Полная перезагрузка на
            // витрину — единственный способ гарантированно их выбросить;
            // мягкий переход отдал бы их из кэша вышедшему человеку.
            void logout();
            window.location.href = `/${locale}`;
          }}
        >
          <LogOutIcon />
          {t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

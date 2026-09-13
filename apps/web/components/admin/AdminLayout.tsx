'use client';

import {useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
import AdminGuard from './AdminGuard';
import {AdminNavLink} from './AdminPrimitives';
import {HAIR, INK, MUTED} from '../../app/[locale]/wv-palette';

// Оболочка админки на примитивах языка витрины (task-admin-white-brief.md).
// Владелец правит сайт с телефона — навигация сворачивается по умолчанию,
// на первом экране виден РАЗДЕЛ (children), а не список разделов. На lg+
// список открыт постоянной колонкой, как раньше.
const NAV_ITEMS = [
  {key: 'dashboard', href: '/admin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1'},
  {key: 'products', href: '/admin/products', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'},
  {key: 'collections', href: '/admin/collections', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'},
  {key: 'inventory', href: '/admin/inventory', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'},
  {key: 'care', href: '/admin/care', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'},
  {key: 'homepage', href: '/admin/homepage', icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10'},
] as const;

export default function AdminLayout({children}: {children: React.ReactNode}) {
  const t = useTranslations('admin');
  const pathname = usePathname() || '/';
  const locale = pathname.split('/')[1] || 'ru';
  // Свёрнуто по умолчанию — это и есть жалоба владельца («меню занимает весь
  // первый экран»). На lg+ читается только визуально (CSS держит колонку
  // открытой через lg:block независимо от значения) — один тумблер вместо
  // двух источников правды проще держать в согласии.
  const [navOpen, setNavOpen] = useState(false);

  const current =
    NAV_ITEMS.find(item => {
      const href = `/${locale}${item.href}`;
      return item.href === '/admin' ? pathname === href : pathname.startsWith(href);
    }) ?? NAV_ITEMS[0];

  return (
    <AdminGuard>
      <div className="min-h-screen">
        {/* Мобильная шапка раздела: тумблер + текущий раздел + выход на
            сайт. lg:hidden — с lg сайдбар открыт своей колонкой всегда,
            шапка ему не нужна. bg-white — своя, а не с <main> ниже: у main
            фона нет нарочно (см. его комментарий), а шапка — целиком новая
            разметка, ей ambient-тёмный фон родительского <body> не нужен. */}
        <div className="flex items-center justify-between border-b bg-white px-4 py-3 lg:hidden" style={{borderColor: HAIR}}>
          <button
            type="button"
            onClick={() => setNavOpen(v => !v)}
            aria-expanded={navOpen}
            aria-controls="admin-nav"
            className="-ml-1 flex min-h-11 items-center gap-2 px-1 text-[13px] uppercase tracking-[0.08em]"
            style={{color: INK}}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              {navOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
            {t(current.key)}
          </button>
          <Link
            href={`/${locale}`}
            className="flex min-h-11 items-center text-[13px] uppercase tracking-[0.08em]"
            style={{color: MUTED}}
          >
            {t('backToSite')}
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row">
          <aside
            id="admin-nav"
            className={`${navOpen ? 'block' : 'hidden'} w-full shrink-0 border-b bg-white lg:block lg:w-56 lg:border-b-0 lg:border-r`}
            style={{borderColor: HAIR}}
          >
            <div className="px-4 py-4 lg:px-5 lg:py-6">
              <h2 className="mb-4 hidden font-display text-lg lg:block" style={{color: INK}}>{t('title')}</h2>
              <nav className="flex flex-col gap-0.5">
                {NAV_ITEMS.map(item => {
                  const href = `/${locale}${item.href}`;
                  const isActive = item.href === '/admin' ? pathname === href : pathname.startsWith(href);
                  return (
                    <AdminNavLink
                      key={item.key}
                      href={href}
                      label={t(item.key)}
                      active={isActive}
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d={item.icon} />
                        </svg>
                      }
                    />
                  );
                })}
              </nav>
              <div className="mt-4 hidden border-t pt-3 lg:block" style={{borderColor: HAIR}}>
                <Link
                  href={`/${locale}`}
                  className="flex min-h-11 items-center gap-2 text-[12px] uppercase tracking-[0.1em]"
                  style={{color: MUTED}}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  {t('backToSite')}
                </Link>
              </div>
            </div>
          </aside>

          {/* Нарочно без фона: AdminLayout — общая оболочка ВСЕХ 13 страниц
              админки, а не только дашборда этой ветки. Крась main белым —
              и ещё не переодетые страницы (товары, коллекции, склад,
              карточки-формы) читают свой кремовый цвет текста старой темы
              на белом вместо тёмного ambient-фона body — де-факто ломает их
              прямо здесь, хотя граница задачи это запрещает. Белую подложку
              конкретно под дашборд даёт сама app/[locale]/admin/page.tsx
              (см. её комментарий про отрицательные отступы) — тем же
              приёмом, каким будет красить себя каждая следующая переодетая
              страница. */}
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </AdminGuard>
  );
}

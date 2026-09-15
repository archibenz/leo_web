'use client';

import type {ReactNode} from 'react';
import {cn} from '@/lib/utils';

// Карточка дашборда в языке блока `dashboard-7`: заголовок мелким шрифтом в
// разрядку, тонкая рамка, скруглённый угол. Своя, а не shadcn `Card`, по
// одной причине — у блока заголовок и содержимое разделены не отступом, а
// подложкой заголовка, и повторять это классами на каждом вызове значило бы
// рассыпать одно решение по десяти местам.
export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  /** Ссылка или кнопка справа от заголовка. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('overflow-hidden rounded-lg bg-background ring-1 ring-border', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3 md:px-5">
          {title && (
            <h2 className="text-[12px] uppercase tracking-[0.12em] text-muted-foreground">{title}</h2>
          )}
          {action}
        </header>
      )}
      <div className="p-4 md:p-5">{children}</div>
    </section>
  );
}

/** Строка «нечего показывать». Отдельно, чтобы пустота везде выглядела одинаково. */
export function PanelEmpty({children}: {children: ReactNode}) {
  return <p className="text-muted-foreground text-[13px]">{children}</p>;
}

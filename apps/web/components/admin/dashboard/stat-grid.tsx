'use client';

import type {ReactNode} from 'react';
import {cn} from '@/lib/utils';

// Сетка чисел в языке блока `dashboard-7`.
//
// У Efferd линии между ячейками сделаны так: ячейки лежат на полотне цвета
// рамки с зазором в один пиксель, и зазор САМ становится линией
// (`gap-px bg-border`). Приём красивый, но у него есть условие: число ячеек
// должно делиться на число столбцов. У нас не делится — три числа в две
// колонки на телефоне, — и на месте недостающей четвёртой ячейки остаётся
// ПРОСВЕТ ПОЛОТНА: бежевый прямоугольник, который читается как поломка.
// Замерено на кадре телефона 15.09, у блока этой беды нет, потому что там
// ячеек ровно три и колонок ровно три.
//
// Поэтому линии рисуют сами ячейки, а полотно белое. Внутренняя сетка на
// пиксель шире и выше обёртки, и `overflow-hidden` срезает лишние границы у
// последнего столбца и последней строки — иначе они удвоили бы рамку.
export function StatGrid({children, className}: {children: ReactNode; className?: string}) {
  return (
    <div className="w-full overflow-hidden rounded-lg bg-background ring-1 ring-border">
      <div className={cn('-mr-px -mb-px grid grid-cols-2 md:grid-cols-3', className)}>
        {children}
      </div>
    </div>
  );
}

type StatProps = {
  label: string;
  value: string;
  /** Приписка под числом: «+3 за неделю». Нет прироста — нет и приписки. */
  delta?: string;
  /**
   * Величина не «ноль», а «нечего показывать»: заказов не было вовсе, выручки
   * не было вовсе. Тогда на месте числа стоит ПРИЧИНА, набранная как текст, а
   * не крупный ноль. Это требование владельца, а не оформление: крупный ноль
   * читается как «продажи упали», хотя оплата ещё не включена.
   */
  empty?: boolean;
  /** Величина, требующая внимания: мало на складе, кончилось. */
  warn?: boolean;
};

export function Stat({label, value, delta, empty, warn}: StatProps) {
  return (
    <div className="border-border border-r border-b bg-background p-4 md:p-5">
      <p className="text-muted-foreground text-[11px] uppercase tracking-[0.12em]">{label}</p>
      <p
        className={cn(
          'mt-2 tabular-nums',
          empty
            ? 'text-muted-foreground text-[13px] leading-snug'
            : 'font-display text-[clamp(22px,2vw,28px)] leading-none',
          warn && !empty && 'text-destructive',
        )}
      >
        {value}
      </p>
      {delta && <p className="mt-2 text-muted-foreground text-[12px]">{delta}</p>}
    </div>
  );
}

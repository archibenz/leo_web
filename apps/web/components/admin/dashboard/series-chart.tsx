'use client';

import {useEffect, useMemo, useState} from 'react';
import {Area, AreaChart, CartesianGrid, XAxis, YAxis} from 'recharts';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

// График ряда по дням для дашборда.
//
// ПОЧЕМУ НЕ ВЗЯТ ГРАФИК ИЗ БЛОКА. `dashboard-7` рисует свой главный график
// через отдельный реестр `@bklit` поверх `@visx` — 265 строк.
//
// Реестр этот **достижим**: установщик сам дописал в components.json адрес
// `https://ui.bklit.com/r/{name}.json`. Сначала я решил, что его нет вовсе, —
// неверно: я спрашивал эти имена у Efferd, а он их и не обязан отдавать.
// Запись из components.json убрана обратно: мы оттуда ничего не берём, а
// лишний сторонний реестр в настройках — лишняя дверь внутрь проекта.
//
// Взять его блок значило бы привезти семейство пакетов `@visx/*` ради одного
// графика, когда recharts уже приехал вместе с примитивами shadcn. Поэтому от
// блока взят ВИД (заливка градиентом под линией, пунктирная сетка, подсказка
// по наведению), а движок наш.
//
// Прежний график был самодельным SVG на 90 строк. Он работал, и меняем его не
// ради свежести: у него не было подсказки по наведению нигде, кроме <title>,
// который на телефоне не показывается вовсе. Владелец смотрит с телефона.

export type SeriesPoint = {date: string; count: number};

// Рисование линии у recharts — анимация на JS, и запрос «поменьше движения»
// она не слышит: этот запрос читает CSS, а не скрипт. Сайт же его уважает в
// пяти местах globals.css, и график обязан вести себя так же, иначе правило
// действует везде, кроме одного экрана, — а это хуже, чем не иметь правила.
//
// Читаем после монтирования, а не при отрисовке: на сервере matchMedia нет, и
// первая отрисовка на клиенте обязана совпасть с серверной.
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  return reduced;
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {day: '2-digit', month: 'short'});
}

export function SeriesChart({
  data,
  label,
  color = 'hsl(var(--sh-chart-1))',
  totalLabel,
}: {
  data: SeriesPoint[];
  /** Подпись ряда — она же в подсказке по наведению. */
  label: string;
  color?: string;
  /** Подпись к сумме за период, например «Всего за период». */
  totalLabel: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const total = useMemo(() => data.reduce((sum, p) => sum + p.count, 0), [data]);
  const config = useMemo(
    () => ({count: {label, color}}) satisfies ChartConfig,
    [label, color],
  );
  const gradientId = useMemo(
    () => `series-${label.replace(/\W+/g, '-').toLowerCase()}`,
    [label],
  );

  const first = data[0]?.date;
  const last = data[data.length - 1]?.date;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 text-[12px]">
        <p className="text-muted-foreground uppercase tracking-[0.08em]">
          {totalLabel}: <span className="text-foreground tabular-nums">{total}</span>
        </p>
        {first && last && (
          <p className="text-muted-foreground shrink-0">
            {formatDay(first)} — {formatDay(last)}
          </p>
        )}
      </div>

      <ChartContainer className="aspect-[16/7] w-full" config={config}>
        <AreaChart accessibilityLayer data={data} margin={{left: 4, right: 8, top: 8}}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.24} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid horizontal strokeDasharray="2 3" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="date"
            minTickGap={40}
            tickFormatter={formatDay}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            width={28}
          />
          <ChartTooltip
            content={<ChartTooltipContent labelFormatter={(value) => formatDay(String(value))} />}
            cursor={false}
          />
          <Area
            dataKey="count"
            fill={`url(#${gradientId})`}
            isAnimationActive={!reducedMotion}
            stroke={color}
            strokeWidth={2}
            type="monotone"
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

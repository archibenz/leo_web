'use client';

import {PanelEmpty} from './panel';

// Список долей — то, что у Efferd зовётся `share-bar-list`: строка с подписью,
// числом и полосой длиной в долю от наибольшего. У нас им показываются топы
// товаров по избранному и по корзинам.
//
// Полоса считается от НАИБОЛЬШЕГО в списке, а не от суммы: вопрос владельца
// здесь «что популярнее», а не «какую часть занимает». Доля от суммы на пяти
// строках из сотен товаров давала бы пять почти одинаковых огрызков.

export type ShareItem = {id: string; title: string; count: number};

export function ShareList({items, emptyText}: {items: ShareItem[]; emptyText: string}) {
  if (items.length === 0) return <PanelEmpty>{emptyText}</PanelEmpty>;

  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <ol className="space-y-3">
      {items.map((item, index) => {
        // Не меньше двух процентов: иначе самый непопулярный товар получает
        // полосу нулевой ширины, и строка выглядит сломанной, а не скромной.
        const width = Math.max(2, Math.round((item.count / max) * 100));
        return (
          <li className="space-y-1.5" key={item.id}>
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="truncate">
                <span className="mr-2 text-muted-foreground tabular-nums">{index + 1}.</span>
                {item.title}
              </span>
              <span className="shrink-0 text-muted-foreground text-[12px] tabular-nums">
                {item.count}
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full"
                style={{width: `${width}%`, background: 'hsl(var(--sh-chart-1))'}}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

'use client';

import type {ReactNode} from 'react';
import {SearchIcon} from 'lucide-react';
import {InputGroup, InputGroupAddon, InputGroupInput} from '@/components/ui/input-group';

// Общая шапка списочных экранов админки: заголовок, действие справа и, если
// нужно, строка поиска. Одна на четыре списка — товары, коллекции, уход,
// склад, — чтобы они не разъехались по мелочам, как разъехались прежние.
//
// Поиск здесь НЕ обязателен и появляется только там, где ему есть что искать.
// Показать строку поиска на списке из четырёх коллекций — обещание работы,
// которой нет.

export function ListPage({
  title,
  action,
  search,
  toolbar,
  children,
}: {
  title: string;
  action?: ReactNode;
  search?: {value: string; onChange: (value: string) => void; placeholder: string; hint?: string};
  /** Переключатели списка под строкой поиска (например, «показывать тестовые»). */
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="*:mb-6 last:*:mb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[clamp(24px,2.4vw,32px)] leading-none">{title}</h1>
        {action}
      </div>

      {search && (
        <div className="space-y-2">
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder}
              value={search.value}
            />
          </InputGroup>
          {/* Подпись под строкой поиска говорит, СКОЛЬКО из скольких видно.
              Без неё отфильтрованный список неотличим от короткого: владелец
              не поймёт, что остальные не пропали, а просто не подходят. */}
          {search.hint && <p className="text-muted-foreground text-[12px]">{search.hint}</p>}
        </div>
      )}

      {toolbar}

      {children}
    </div>
  );
}

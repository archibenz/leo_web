'use client';

import type {ReactNode} from 'react';
import {InfoIcon} from 'lucide-react';

// Пометка о границе раздела: «здесь можно завести, но на сайт это не уедет».
//
// Такие пометки в админке уже есть и появились не от любви к словам, а после
// `lw-fbpw`: владелец полдня правил поля, которых витрина не читает, и не мог
// понять, почему на сайте ничего не меняется. С тех пор правило простое —
// если экран принимает то, чего сайт не покажет, он обязан сказать об этом
// САМ, до правки, а не после.
//
// Вид нарочно спокойный: это не беда и не ошибка, а граница. Сигнальный цвет
// здесь был бы неправдой — раздел работает, просто не там, где ждут.
export function Notice({children}: {children: ReactNode}) {
  return (
    <p className="flex items-start gap-2.5 rounded-lg bg-muted px-3.5 py-3 text-[12px] leading-relaxed text-muted-foreground">
      <InfoIcon className="mt-px size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

'use client';

import {useEffect, useState} from 'react';
import {useTranslations} from 'next-intl';
import {subscribeToasts, dismissToast, type Toast} from '../lib/toast';

// Уведомитель. Монтируется ТОЛЬКО в админской ветке
// (app/[locale]/(admin)/layout.tsx) — витрина его не поднимает.
//
// Переодет 15.09 вместе с остальной админкой, и это не украшательство: он был
// набран старой тёмной темой — `liquid-glass-strong` (почти чёрная подложка),
// кремовые буквы и золотая полоса слева. На белой админке он вставал
// коричневым прямоугольником поверх заголовка экрана.
//
// Названия прежних токенов здесь нарочно не выписаны: сторож палитры ищет их
// простым поиском по тексту файла и не отличает упоминание в пояснении от
// применения в коде. Послабить его было бы хуже — сторож, пропускающий
// настоящее золото, молчит, а ложная тревога кричит и чинится за минуту.
//
// Нашлось это не поиском по коду, а на кадре: экран переодет, а поверх него
// сообщение в палитре, от которой мы уходим. В список переезжающих файлов он
// не попал, потому что лежит вне `components/admin/` — теперь он в стороже
// палитры (app/[locale]/(admin)/admin/__tests__/paletteCompliance.test.ts).
export default function Toaster() {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const t = useTranslations();

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      role="region"
      aria-label={t('common.notifications')}
      className="fixed top-4 right-4 left-4 z-[200] flex flex-col gap-2 pointer-events-none sm:left-auto sm:max-w-sm"
    >
      {toasts.map(toast => {
        const text = resolveText(t, toast);
        // Полоса слева — единственный цвет на сообщении. Красная только у
        // беды: если красить ею и обычное уведомление, беду перестанут
        // замечать. То же правило действует на дашборде и в списках.
        const stripe =
          toast.kind === 'error'
            ? 'hsl(var(--sh-destructive))'
            : toast.kind === 'success'
            ? 'var(--status-success)'
            : 'hsl(var(--sh-foreground))';
        return (
          <div
            key={toast.id}
            role="alert"
            style={{borderLeftColor: stripe}}
            className="pointer-events-auto flex items-start gap-3 rounded-lg border border-border border-l-[3px] bg-background px-4 py-3 text-sm text-foreground shadow-lg"
          >
            <span className="flex-1 leading-snug">{text}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="-my-2 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-lg leading-none text-muted-foreground transition-colors hover:text-foreground"
              aria-label={t('common.dismissNotification')}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

function resolveText(
  t: ReturnType<typeof useTranslations>,
  toast: Toast,
): string {
  if (toast.messageKey) {
    try {
      return t(toast.messageKey);
    } catch {
      return toast.message ?? toast.messageKey;
    }
  }
  return toast.message ?? '';
}

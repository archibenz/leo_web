'use client';

import {useEffect, useState} from 'react';
import {useTranslations} from 'next-intl';
import {subscribeToasts, dismissToast, type Toast} from '../lib/toast';

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
      className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm pointer-events-none"
    >
      {toasts.map(toast => {
        const text = resolveText(t, toast);
        const accent =
          toast.kind === 'error'
            ? 'var(--status-error)'
            : toast.kind === 'success'
            ? 'var(--status-success)'
            : 'var(--accent)';
        return (
          <div
            key={toast.id}
            role="alert"
            style={{borderLeftColor: accent}}
            className="liquid-glass-strong pointer-events-auto flex items-start gap-3 rounded-xl border-l-[3px] px-4 py-3 text-sm text-ink-soft"
          >
            <span className="flex-1 leading-snug">{text}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="-mr-1 -mt-0.5 shrink-0 rounded-md p-1 text-lg leading-none text-ink-soft/60 transition-colors hover:text-ink-soft"
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

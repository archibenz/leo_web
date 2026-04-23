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
      aria-label="Notifications"
      className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm pointer-events-none"
    >
      {toasts.map(toast => {
        const text = resolveText(t, toast);
        const kindStyles =
          toast.kind === 'error'
            ? 'bg-red-50 border-red-200 text-red-900'
            : toast.kind === 'success'
            ? 'bg-green-50 border-green-200 text-green-900'
            : 'bg-neutral-50 border-neutral-200 text-neutral-900';
        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto border rounded-md px-4 py-3 shadow-md text-sm flex items-start gap-3 ${kindStyles}`}
          >
            <span className="flex-1 leading-snug">{text}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="opacity-60 hover:opacity-100 transition-opacity text-lg leading-none"
              aria-label="Закрыть уведомление"
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

'use client';

import {useEffect, useRef, type ReactNode} from 'react';
import {useTranslations} from 'next-intl';

interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const t = useTranslations('common');
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus cancel button once mounted
    const raf = requestAnimationFrame(() => {
      cancelButtonRef.current?.focus();
    });

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      } else if (e.key === 'Tab' && dialogRef.current) {
        // Simple focus trap between two buttons
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
      previousFocus?.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xl"
      onClick={onCancel}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-md rounded-2xl bg-[var(--paper)] p-6 shadow-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={message ? 'confirm-dialog-message' : undefined}
      >
        <h2
          id="confirm-dialog-title"
          className="font-display text-xl text-[var(--ink)] sm:text-2xl"
        >
          {title}
        </h2>
        {message && (
          <p
            id="confirm-dialog-message"
            className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]"
          >
            {message}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[var(--ink)]/15 px-6 py-3 text-sm font-medium uppercase tracking-wider text-[var(--ink)] transition hover:border-[var(--ink)]/35 hover:bg-[var(--ink)]/5 focus:outline-none focus:ring-2 focus:ring-[var(--ink)]/20"
          >
            {cancelLabel ?? t('cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium uppercase tracking-wider text-white transition hover:bg-[var(--accent)]/85 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
          >
            {confirmLabel ?? t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

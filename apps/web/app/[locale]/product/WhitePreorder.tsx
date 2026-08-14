'use client';

import {useEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {useFocusTrap} from '../../../lib/useFocusTrap';
import {INK, MUTED, HAIR} from '../wv-palette';

// Pre-order: the garment is nowhere to be bought — not here, not on a
// marketplace — so instead of a dead button the page takes a name and tells the
// shop someone is waiting. Deliberately small: an email, the size if one is
// already chosen, and a line if they want to say something. Anything longer and
// people abandon it, and the shop only needs enough to write back.

export default function WhitePreorder({product, size}: {product: string; size: string | null}) {
  const t = useTranslations('white.pdp');
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error' | 'invalid'>('idle');
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state !== 'sending') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, state]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    try {
      const res = await fetch('/preorder', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, product, size: size ?? undefined, note: note || undefined}),
      });
      if (res.ok) {
        setState('sent');
        return;
      }
      // 400 is the reader's problem to fix (a malformed address); everything
      // else is ours, and saying so keeps them from retyping a good email.
      setState(res.status === 400 ? 'invalid' : 'error');
    } catch {
      setState('error');
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setState('idle');
          setOpen(true);
        }}
        className="wv-btn w-full px-8 py-4 text-[12px] uppercase tracking-[0.2em]"
      >
        {t('preorder')}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[rgba(28,23,20,0.42)] p-0 sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="wv-preorder-title"
            className="w-full max-w-[440px] bg-white px-6 pb-8 pt-7 sm:px-9"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <h2 id="wv-preorder-title" className="font-display text-[22px] font-light leading-tight" style={{color: INK}}>
                {t('preorderTitle')}
              </h2>
              <button type="button" onClick={close} aria-label={t('close')} className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center text-[17px] leading-none" style={{color: MUTED}}>
                ×
              </button>
            </div>

            {state === 'sent' ? (
              <>
                <p className="text-[14px] leading-relaxed" style={{color: MUTED}}>{t('preorderSent')}</p>
                <button type="button" onClick={close} className="wv-btn mt-7 w-full px-8 py-4 text-[12px] uppercase tracking-[0.2em]">
                  {t('close')}
                </button>
              </>
            ) : (
              <form onSubmit={submit} noValidate>
                <p className="mb-6 text-[14px] leading-relaxed" style={{color: MUTED}}>
                  {t('preorderBody', {name: product})}
                </p>

                <label htmlFor="wv-preorder-email" className="mb-2 block text-[11px] uppercase tracking-[0.2em]" style={{color: MUTED}}>
                  {t('preorderEmail')}
                </label>
                <input
                  id="wv-preorder-email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mb-5 h-12 w-full border px-4 text-[15px] outline-none focus-visible:border-[#1c1714]"
                  style={{borderColor: HAIR, color: INK}}
                />

                <label htmlFor="wv-preorder-note" className="mb-2 block text-[11px] uppercase tracking-[0.2em]" style={{color: MUTED}}>
                  {size ? t('preorderNoteWithSize', {size}) : t('preorderNote')}
                </label>
                <textarea
                  id="wv-preorder-note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full resize-none border px-4 py-3 text-[15px] outline-none focus-visible:border-[#1c1714]"
                  style={{borderColor: HAIR, color: INK}}
                />

                {(state === 'error' || state === 'invalid') && (
                  <p role="alert" className="mt-4 text-[13px]" style={{color: '#a02a24'}}>
                    {state === 'invalid' ? t('preorderInvalid') : t('preorderError')}
                  </p>
                )}

                <button type="submit" disabled={state === 'sending'} className="wv-btn mt-7 w-full px-8 py-4 text-[12px] uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-50">
                  {state === 'sending' ? t('preorderSending') : t('preorderSubmit')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

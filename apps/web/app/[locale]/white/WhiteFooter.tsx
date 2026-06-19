'use client';

import {useEffect, useState, type FormEvent} from 'react';
import {isValidEmail} from '../../../lib/validation';
import {INK, MUTED, HAIR, SIGNAL} from './wv-palette';
import WhiteLocaleSwitch from './WhiteLocaleSwitch';

// Variant 2 "White" — shared editorial footer. Rendered on the landing, shop
// and PDP so every page of the prototype closes on the same brand chrome.
// Prototype destinations stay inside /white (no leak to the gradient site).
// The newsletter is real & honest: it posts to /api/newsletter/subscribe (the
// same endpoint the gradient footer uses) and reports the true outcome.

type NlStatus = 'idle' | 'loading' | 'success' | 'already' | 'error' | 'invalid';

export default function WhiteFooter({locale}: {locale: string}) {
  const ru = locale === 'ru';
  const t = (en: string, rus: string) => (ru ? rus : en);

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<NlStatus>('idle');

  useEffect(() => {
    if (status !== 'success') return;
    const timer = window.setTimeout(() => setStatus('idle'), 4000);
    return () => window.clearTimeout(timer);
  }, [status]);

  const onSubscribe = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setStatus('invalid');
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email: email.trim(), locale}),
      });
      if (!res.ok) {
        setStatus('error');
        return;
      }
      const data = (await res.json()) as {status?: string};
      setStatus(data.status === 'already' ? 'already' : 'success');
      setEmail('');
    } catch {
      setStatus('error');
    }
  };

  const nlMessage =
    status === 'success'
      ? t('Thanks — you are subscribed.', 'Спасибо — вы подписаны.')
      : status === 'already'
        ? t('You are already subscribed.', 'Вы уже подписаны.')
        : status === 'error'
          ? t('Something went wrong. Try again.', 'Что-то пошло не так. Попробуйте ещё раз.')
          : status === 'invalid'
            ? t('Enter a valid email.', 'Введите корректный email.')
            : '';
  const nlError = status === 'error' || status === 'invalid';
  const nlLocked = status === 'loading' || status === 'success';

  return (
    <footer className="border-t" style={{borderColor: HAIR}}>
      <div className="mx-auto grid max-w-[1400px] gap-10 px-6 py-16 sm:grid-cols-2 sm:px-10 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <p className="font-display text-[20px] tracking-[0.3em]">REINASLEO</p>
          <p className="mt-3 text-[12px] leading-relaxed" style={{color: MUTED}}>{t('Premium womenswear', 'Премиальная женская одежда')}</p>
        </div>
        {[
          {h: t('Shop', 'Магазин'), items: [
            {label: t('New', 'Новинки'), href: `/${locale}/white/shop`},
            {label: t('Dresses', 'Платья'), href: `/${locale}/white/shop?cat=dresses`},
            {label: t('Outerwear', 'Верхняя одежда'), href: `/${locale}/white/shop?cat=outerwear`},
          ]},
          {h: t('Brand', 'Бренд'), items: [
            // Real, distinct destinations — the landing's editorial sections.
            // (No standalone About/Care/Contact pages exist in the prototype, so
            // we don't pretend to link to them.)
            {label: t('The atelier', 'Ателье'), href: `/${locale}/white#wv-atelier`},
            {label: t('The edit', 'Подборка'), href: `/${locale}/white#wv-edit`},
          ]},
        ].map((col) => (
          <div key={col.h}>
            <p className="mb-4 text-[11px] uppercase tracking-[0.2em]" style={{color: INK}}>{col.h}</p>
            <ul className="space-y-2.5 text-[13px]" style={{color: MUTED}}>
              {col.items.map((it) => (
                <li key={it.label}>
                  <a href={it.href} className="inline-block transition-opacity hover:opacity-60">{it.label}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <p className="mb-4 text-[11px] uppercase tracking-[0.2em]" style={{color: INK}}>{t('Newsletter', 'Рассылка')}</p>
          <form onSubmit={onSubscribe} noValidate className="flex items-center border-b pb-1.5" style={{borderColor: MUTED}}>
            <label htmlFor="wv-newsletter" className="sr-only">{t('Email address', 'Email-адрес')}</label>
            <input
              id="wv-newsletter"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status !== 'idle' && status !== 'loading') setStatus('idle');
              }}
              disabled={nlLocked}
              aria-invalid={status === 'invalid' ? true : undefined}
              aria-describedby="wv-newsletter-status"
              placeholder={t('Email', 'Email')}
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-[#7a7167] disabled:opacity-50"
              style={{color: INK}}
            />
            <button
              type="submit"
              disabled={nlLocked}
              aria-label={t('Subscribe', 'Подписаться')}
              className="shrink-0 px-1 text-[12px] uppercase tracking-[0.16em] transition-opacity hover:opacity-60 disabled:opacity-40"
              style={{color: INK}}
            >
              {status === 'loading' ? '…' : '→'}
            </button>
          </form>
          <p
            id="wv-newsletter-status"
            aria-live="polite"
            aria-atomic="true"
            role={nlError ? 'alert' : undefined}
            className="mt-2 min-h-[14px] text-[11px] leading-snug"
            style={{color: nlError ? SIGNAL : MUTED}}
          >
            {nlMessage}
          </p>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-6 pb-10 text-[11px] uppercase tracking-[0.14em] sm:px-10" style={{color: MUTED}}>
        <span>© 2026 REINASLEO · {t('White variant — preview', 'Белый вариант — превью')}</span>
        <WhiteLocaleSwitch locale={locale} />
      </div>
    </footer>
  );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';
import {useEffect, useRef, useState, type FormEvent} from 'react';
import {useTranslations} from 'next-intl';
import {isValidEmail} from '../../lib/validation';
import {INK, MUTED, HAIR, SIGNAL} from './wv-palette';
import WhiteLocaleSwitch from './WhiteLocaleSwitch';
import WhiteCookieNotice from './WhiteCookieNotice';

// Variant 2 "White" — shared editorial footer. Rendered on the landing, shop
// and PDP so every page of the prototype closes on the same brand chrome.
// Prototype destinations stay inside the storefront (no leak to the gradient site).
// The newsletter is real & honest: it posts to /newsletter (outside /api/ so nginx routes it to Next, not Spring) (the
// same endpoint the gradient footer uses) and reports the true outcome.

type NlStatus = 'idle' | 'loading' | 'success' | 'already' | 'error' | 'invalid';

export default function WhiteFooter({locale}: {locale: string}) {
  const t = useTranslations('white.footer');
  const tf = useTranslations('footer');

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<NlStatus>('idle');
  // Synchronous in-flight flag: the disabled attribute and a status check both
  // only update on the next render, so a same-frame touch double-tap could slip
  // a second POST through. A ref flips immediately and closes that window.
  const submittingRef = useRef(false);

  useEffect(() => {
    if (status !== 'success') return;
    const timer = window.setTimeout(() => setStatus('idle'), 4000);
    return () => window.clearTimeout(timer);
  }, [status]);

  const onSubscribe = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!isValidEmail(email)) {
      setStatus('invalid');
      return;
    }
    submittingRef.current = true;
    setStatus('loading');
    try {
      const res = await fetch('/newsletter', {
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
    } finally {
      submittingRef.current = false;
    }
  };

  const nlMessage =
    status === 'success'
      ? t('subscribed')
      : status === 'already'
        ? t('alreadySubscribed')
        : status === 'error'
          ? t('error')
          : status === 'invalid'
            ? t('invalidEmail')
            : '';
  const nlError = status === 'error' || status === 'invalid';
  const nlLocked = status === 'loading' || status === 'success';

  return (
    <footer className="border-t" style={{borderColor: HAIR}}>
      <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-x-6 gap-y-6 px-6 py-7 sm:gap-10 sm:px-10 sm:py-16 lg:grid-cols-4">
        <div className="col-span-2 lg:col-span-1">
          <Image src="/logos/name-black.svg" alt="REINASLEO" width={1026} height={162} className="h-[14px] w-auto" />
          <p className="mt-2 text-[12px] leading-relaxed sm:mt-3 lg:text-[14px]" style={{color: MUTED}}>{t('tagline')}</p>
        </div>
        {[
          {h: t('shop'), items: [
            {label: t('new'), href: `/${locale}/shop`},
            {label: t('dresses'), href: `/${locale}/shop?cat=dresses`},
            {label: t('outerwear'), href: `/${locale}/shop?cat=outerwear`},
          ]},
          {h: t('brand'), items: [
            // Real, distinct destinations — Atelier and Lookbook are standalone
            // pages; The edit deep-links to the curated section on the landing.
            {label: t('sets'), href: `/${locale}/sets`},
            {label: t('lookbook'), href: `/${locale}/lookbook`},
            {label: t('theEdit'), href: `/${locale}#wv-edit`},
            {label: t('contact'), href: `/${locale}/contact`},
            {label: t('delivery'), href: `/${locale}/delivery`},
            {label: t('faq'), href: `/${locale}/faq`},
            {label: t('care'), href: `/${locale}/care`},
          ]},
        ].map((col) => (
          <div key={col.h}>
            <p className="mb-2 text-[11px] uppercase tracking-[0.2em] sm:mb-4 lg:text-[12px]" style={{color: INK}}>{col.h}</p>
            {/* min-h keeps the tap height (40px mobile / 44px sm+, project a11y
                floor) — the mobile column is compressed via spacing only, the
                targets themselves must not shrink. */}
            <ul className="space-y-0.5 text-[13px] sm:space-y-1 lg:space-y-1.5 lg:text-[15px]" style={{color: MUTED}}>
              {col.items.map((it) => (
                <li key={it.label}>
                  <Link href={it.href} className="flex min-h-10 items-center transition-opacity hover:opacity-60 sm:min-h-11">{it.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="col-span-2 sm:col-span-1">
          <p className="mb-2 text-[11px] uppercase tracking-[0.2em] sm:mb-4 lg:text-[12px]" style={{color: INK}}>{t('newsletter')}</p>
          <form onSubmit={onSubscribe} noValidate className="flex items-center border-b pb-1.5" style={{borderColor: MUTED}}>
            <label htmlFor="wv-newsletter" className="sr-only">{t('emailLabel')}</label>
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
              placeholder={t('email')}
              className="min-h-11 w-full bg-transparent py-2.5 text-[13px] outline-none placeholder:text-[#7a7167] disabled:opacity-50 lg:text-[15px]"
              style={{color: INK}}
            />
            <button
              type="submit"
              disabled={nlLocked}
              aria-label={t('subscribe')}
              className="-my-2.5 flex h-11 w-11 shrink-0 items-center justify-center text-[14px] uppercase tracking-[0.16em] transition-opacity hover:opacity-60 disabled:opacity-40"
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
          {/* 152-ФЗ: собираем e-mail — под формой living-строка согласия со
              ссылкой на политику; сабмит и есть подтверждающее действие. */}
          <p className="mt-1.5 text-[10.5px] leading-relaxed" style={{color: MUTED}}>
            {t.rich('newsletterConsent', {
              policy: (chunks) => (
                <Link href={`/${locale}/privacy`} className="wv-link-inline" style={{color: INK}}>{chunks}</Link>
              ),
            })}
          </p>
        </div>
      </div>
      {/* Seller identity — distance-selling rules put it on the site itself. */}
      <p className="mx-auto max-w-[1400px] px-6 pb-3 text-[10.5px] leading-relaxed sm:px-10" style={{color: MUTED}}>
        {tf('legalEntity')}
      </p>
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-6 pb-6 text-[11px] uppercase tracking-[0.14em] sm:gap-4 sm:px-10 sm:pb-10 lg:text-[12px]" style={{color: MUTED}}>
        <span>© 2026 REINASLEO · {t('previewNote')}</span>
        <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href={`/${locale}/privacy`} className="wv-link -my-3 inline-flex min-h-11 items-center"><span className="wv-link-ink">{t('privacy')}</span></Link>
          <Link href={`/${locale}/offer`} className="wv-link -my-3 inline-flex min-h-11 items-center"><span className="wv-link-ink">{t('offer')}</span></Link>
          <Link href={`/${locale}/terms`} className="wv-link -my-3 inline-flex min-h-11 items-center"><span className="wv-link-ink">{t('terms')}</span></Link>
          <WhiteLocaleSwitch locale={locale} />
        </span>
      </div>
      <WhiteCookieNotice locale={locale} />
    </footer>
  );
}

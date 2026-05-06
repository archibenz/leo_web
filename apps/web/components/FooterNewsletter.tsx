'use client';

import {useState, type FormEvent} from 'react';
import {useTranslations} from 'next-intl';
import {isValidEmail} from '../lib/validation';

type Status = 'idle' | 'loading' | 'success' | 'already' | 'error' | 'invalid';

interface FooterNewsletterProps {
  locale: string;
}

export default function FooterNewsletter({locale}: FooterNewsletterProps) {
  const t = useTranslations('footer.newsletter');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
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
      if (data.status === 'already') {
        setStatus('already');
      } else {
        setStatus('success');
      }
      setEmail('');
    } catch {
      setStatus('error');
    }
  };

  const message =
    status === 'success'
      ? t('success')
      : status === 'already'
        ? t('already')
        : status === 'error'
          ? t('error')
          : status === 'invalid'
            ? t('invalid')
            : null;

  const isLocked = status === 'loading' || status === 'success';

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-2"
      aria-label={t('description')}
      noValidate
    >
      <div className="flex items-center gap-2 border-b border-[#F2E6D8]/15 pb-2 transition-colors duration-200 focus-within:border-[#D4A574]/60">
        <input
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status !== 'idle' && status !== 'loading') setStatus('idle');
          }}
          placeholder={t('placeholder')}
          aria-label={t('placeholder')}
          disabled={isLocked}
          className="flex-1 bg-transparent py-2 text-[14px] text-[#F2E6D8]/90 placeholder:text-[#F2E6D8]/30 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLocked}
          className="font-accent text-[10px] uppercase tracking-[0.3em] text-[#D4A574] transition-colors duration-200 hover:text-[#F2E6D8] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === 'loading' ? t('submitting') : t('submit')}
        </button>
      </div>
      {message && (
        <p
          aria-live="polite"
          className={`font-accent text-[10px] uppercase tracking-[0.2em] ${
            status === 'error' || status === 'invalid'
              ? 'text-[#c08a82]'
              : 'text-[#D4A574]/80'
          }`}
        >
          {message}
        </p>
      )}
    </form>
  );
}

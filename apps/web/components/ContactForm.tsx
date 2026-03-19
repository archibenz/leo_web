'use client';

import {FormEvent, useState} from 'react';
import {useTranslations} from 'next-intl';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactForm() {
  const t = useTranslations('contact.form');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('submitting');
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      message: formData.get('message') as string
    };

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080'}/api/contact`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload)
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Request failed');
      }

      setStatus('success');
      event.currentTarget.reset();
    } catch (err) {
      setStatus('error');
      setError((err as Error).message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium text-ink">
          {t('name')}
          <input
            name="name"
            required
            aria-required="true"
            className="rounded-lg border border-ink/20 bg-white/70 px-4 py-3 text-ink outline-none transition focus:border-accent"
            placeholder={t('namePlaceholder')}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-ink">
          {t('email')}
          <input
            name="email"
            type="email"
            required
            aria-required="true"
            className="rounded-lg border border-ink/20 bg-white/70 px-4 py-3 text-ink outline-none transition focus:border-accent"
            placeholder={t('emailPlaceholder')}
          />
        </label>
      </div>
      <label className="flex flex-col gap-2 text-sm font-medium text-ink">
        {t('message')}
        <textarea
          name="message"
          required
          aria-required="true"
          rows={5}
          className="rounded-lg border border-ink/20 bg-white/70 px-4 py-3 text-ink outline-none transition focus:border-accent"
          placeholder={t('messagePlaceholder')}
        />
      </label>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-ink-soft">
          <input id="consent-contact" type="checkbox" required className="accent-accent" />
          <label htmlFor="consent-contact">{t('consent')}</label>
        </div>
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="rounded-full border border-button/70 bg-button px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-ink shadow-subtle transition hover:-translate-y-0.5 hover:shadow-card disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'submitting' ? t('sending') : t('submit')}
        </button>
      </div>
      <div aria-live="polite" role="status" className="text-sm text-ink-soft">
        {status === 'success' && <span>{t('success')}</span>}
        {status === 'error' && <span role="alert">{error ?? t('error')}</span>}
      </div>
    </form>
  );
}

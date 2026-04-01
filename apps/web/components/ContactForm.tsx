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
    const form = event.currentTarget;
    setStatus('submitting');
    setError(null);

    const formData = new FormData(form);
    const payload = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      message: formData.get('message') as string
    };

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE ?? ''}/api/contact`,
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
      form.reset();
    } catch (err) {
      setStatus('error');
      setError((err as Error).message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-[12px] font-medium uppercase tracking-[0.15em] text-ink/40">
            {t('name')}
          </label>
          <input
            name="name"
            required
            aria-required="true"
            className="w-full rounded-xl border border-[#D4A574]/[0.08] bg-[#1a100c]/40 px-4 py-3.5 text-[15px] text-ink/80 placeholder:text-ink/25 outline-none transition-all duration-300 focus:border-[#D4A574]/30 focus:bg-[#1a100c]/60"
            placeholder={t('namePlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[12px] font-medium uppercase tracking-[0.15em] text-ink/40">
            {t('email')}
          </label>
          <input
            name="email"
            type="email"
            required
            aria-required="true"
            className="w-full rounded-xl border border-[#D4A574]/[0.08] bg-[#1a100c]/40 px-4 py-3.5 text-[15px] text-ink/80 placeholder:text-ink/25 outline-none transition-all duration-300 focus:border-[#D4A574]/30 focus:bg-[#1a100c]/60"
            placeholder={t('emailPlaceholder')}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="block text-[12px] font-medium uppercase tracking-[0.15em] text-ink/40">
          {t('message')}
        </label>
        <textarea
          name="message"
          required
          aria-required="true"
          rows={6}
          className="w-full rounded-xl border border-[#D4A574]/[0.08] bg-[#1a100c]/40 px-4 py-3.5 text-[15px] text-ink/80 placeholder:text-ink/25 outline-none transition-all duration-300 focus:border-[#D4A574]/30 focus:bg-[#1a100c]/60 resize-none"
          placeholder={t('messagePlaceholder')}
        />
      </div>
      <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5 text-[12px] text-ink/30">
          <input id="consent-contact" type="checkbox" required className="accent-[#D4A574] h-4 w-4 mt-0.5 shrink-0" />
          <label htmlFor="consent-contact">{t('consent')}</label>
        </div>
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full sm:w-auto rounded-full bg-[#D4A574] px-8 py-3 text-[13px] font-medium uppercase tracking-[0.12em] text-[#1E120D] transition-all duration-300 hover:bg-[#D4A574]/90 hover:-translate-y-0.5 disabled:opacity-50"
        >
          {status === 'submitting' ? t('sending') : t('submit')}
        </button>
      </div>
      <div aria-live="polite" role="status" className="text-sm">
        {status === 'success' && <span className="text-green-400/80">{t('success')}</span>}
        {status === 'error' && <span role="alert" className="text-red-400/80">{error ?? t('error')}</span>}
      </div>
    </form>
  );
}

'use client';

import {FormEvent, useState} from 'react';
import {useTranslations} from 'next-intl';
import {API_BASE} from '../lib/api';
import {track} from '../lib/analytics';

type Status = 'idle' | 'submitting' | 'success' | 'error';

const fieldClass =
  'w-full rounded-lg border border-[#D4A574]/15 bg-[#140c08]/40 px-3.5 py-2.5 text-[14px] text-ink/85 placeholder:text-ink/50 outline-none transition-colors duration-300 focus:border-[#D4A574]/40';
const labelClass = 'block text-[13px] text-ink/65';

export default function ContactForm() {
  const t = useTranslations('contact.form');
  const [status, setStatus] = useState<Status>('idle');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus('submitting');

    const formData = new FormData(form);
    const payload = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      message: formData.get('message') as string
    };

    try {
      const res = await fetch(
        `${API_BASE}/api/contact`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload)
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Request failed with status ${res.status}`);
      }

      setStatus('success');
      track('contact_submit');
      form.reset();
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('ContactForm submit failed', err);
      }
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="contact-name" className={labelClass}>
          {t('name')}
        </label>
        <input
          id="contact-name"
          name="name"
          required
          aria-required="true"
          className={fieldClass}
          placeholder={t('namePlaceholder')}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="contact-email" className={labelClass}>
          {t('email')}
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          aria-required="true"
          className={fieldClass}
          placeholder={t('emailPlaceholder')}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="contact-message" className={labelClass}>
          {t('message')}
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          aria-required="true"
          rows={5}
          className={`${fieldClass} resize-none`}
          placeholder={t('messagePlaceholder')}
        />
      </div>

      <div className="flex items-start gap-2.5 text-[12px] leading-relaxed text-ink/65">
        <input id="consent-contact" type="checkbox" required className="accent-[#D4A574] h-4 w-4 mt-0.5 shrink-0" />
        <label htmlFor="consent-contact">{t('consent')}</label>
      </div>

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="mt-1 w-full rounded-full bg-[#9A3A2A] px-8 py-3 text-[13px] font-medium tracking-[0.04em] text-ink transition-all duration-300 hover:bg-[#b14534] hover:-translate-y-0.5 disabled:opacity-50"
      >
        {status === 'submitting' ? t('sending') : t('submit')}
      </button>

      <div role={status === 'error' ? 'alert' : 'status'} className="min-h-[1.25rem] text-sm">
        {status === 'success' && <span className="text-green-400/80">{t('success')}</span>}
        {status === 'error' && <span className="text-red-400/80">{t('error')}</span>}
      </div>
    </form>
  );
}

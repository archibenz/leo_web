'use client';

import {useEffect, useState, useCallback} from 'react';
import {useTranslations, useLocale} from 'next-intl';
import {useRouter} from 'next/navigation';
import {useAuth} from '../../../../contexts';
import HeroShaderBackgroundClient from '../../../../components/HeroShaderBackgroundClient';
import Spinner from '../../../../components/ui/Spinner';
import Link from 'next/link';

type LinkStep = 'email' | 'code';

export default function SettingsPage() {
  const t = useTranslations('account');
  const locale = useLocale();
  const router = useRouter();
  const {user, isAuthenticated, isLoading, logout, sendCode, linkEmail, updateNewsletterPreferences} = useAuth();

  const [linkStep, setLinkStep] = useState<LinkStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [linking, setLinking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Newsletter toggles
  const [promos, setPromos] = useState(false);
  const [collections, setCollections] = useState(false);
  const [projects, setProjects] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/${locale}/account`);
    }
  }, [isAuthenticated, isLoading, locale, router]);

  // Sync newsletter state from user
  useEffect(() => {
    if (user) {
      setPromos(user.newsletterPromos ?? false);
      setCollections(user.newsletterCollections ?? false);
      setProjects(user.newsletterProjects ?? false);
    }
  }, [user]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSendCode = useCallback(async () => {
    setError('');
    setSending(true);
    const result = await sendCode(email);
    setSending(false);
    if (result.success) {
      setLinkStep('code');
      setCooldown(60);
    } else {
      setError(result.error === 'invalid_email' ? t('errors.invalidEmail') : t('errors.sendCodeFailed'));
    }
  }, [email, sendCode, t]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0) return;
    setSending(true);
    const result = await sendCode(email);
    setSending(false);
    if (result.success) setCooldown(60);
  }, [email, cooldown, sendCode]);

  const handleLink = useCallback(async () => {
    if (code.trim().length !== 6) {
      setError(t('errors.invalidCode'));
      return;
    }
    setError('');
    setLinking(true);
    const result = await linkEmail(email, code);
    setLinking(false);
    if (result.success) {
      setSuccess(true);
    } else if (result.error === 'email_already_linked') {
      setError(t('settings.linkEmail.alreadyLinked'));
    } else if (result.error === 'invalid_code') {
      setError(t('errors.invalidCode'));
    } else {
      setError(t('errors.genericError'));
    }
  }, [email, code, linkEmail, t]);

  const handleToggle = useCallback(async (key: 'promos' | 'collections' | 'projects', value: boolean) => {
    const newPrefs = {promos, collections, projects, [key]: value};
    if (key === 'promos') setPromos(value);
    if (key === 'collections') setCollections(value);
    if (key === 'projects') setProjects(value);

    setSavingPrefs(true);
    await updateNewsletterPreferences(newPrefs);
    setSavingPrefs(false);
  }, [promos, collections, projects, updateNewsletterPreferences]);

  if (isLoading) {
    return (
      <div className="relative min-h-screen pt-28 pb-6">
        <HeroShaderBackgroundClient />
        <div className="relative z-10 flex min-h-[60vh] items-center justify-center px-6 lg:px-8">
          <div className="paper-card p-10 text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-ink-soft">{t('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const emailLinked = !!user?.email;

  return (
    <div className="relative min-h-screen pt-28 pb-6">
      <HeroShaderBackgroundClient />
      <div className="relative z-10 flex min-h-[60vh] items-center justify-center px-6 lg:px-8">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center">
            <h1 className="font-display text-ink text-[clamp(1.5rem,3.5vw,2.25rem)]">
              {t('settings.title')}
            </h1>
          </div>

          {/* ── Link Email ── */}
          <div className="paper-card p-6 space-y-5">
            <div>
              <h2 className="font-display text-[16px] font-semibold text-ink tracking-wide">
                {t('settings.linkEmail.title')}
              </h2>
              <p className="mt-1 text-[13px] text-ink/50">
                {t('settings.linkEmail.description')}
              </p>
            </div>

            {emailLinked && !success ? (
              <div className="flex items-center gap-2">
                <span className="text-[14px] text-ink/70">{user?.email}</span>
                <span className="inline-flex items-center rounded-full bg-[#D4A574]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#D4A574]">
                  {t('profile.emailVerified')}
                </span>
              </div>
            ) : success ? (
              <div className="rounded-xl bg-[#D4A574]/10 border border-[#D4A574]/20 px-4 py-3">
                <p className="text-[14px] text-[#D4A574] font-medium">
                  {t('settings.linkEmail.success')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Email input */}
                <div>
                  <label className="block text-[12px] font-medium uppercase tracking-wider text-ink/50 mb-1.5">
                    {t('settings.linkEmail.emailLabel')}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('settings.linkEmail.emailPlaceholder')}
                    disabled={linkStep !== 'email'}
                    className="admin-input disabled:opacity-50"
                    onKeyDown={(e) => e.key === 'Enter' && linkStep === 'email' && handleSendCode()}
                  />
                  {linkStep === 'email' && (
                    <button
                      onClick={handleSendCode}
                      disabled={sending || !email.trim()}
                      className="mt-3 w-full lux-btn-primary disabled:opacity-50"
                    >
                      {sending ? t('settings.linkEmail.sending') : t('settings.linkEmail.sendCode')}
                    </button>
                  )}
                </div>

                {/* Code input */}
                {linkStep === 'code' && (
                  <div>
                    <label className="block text-[12px] font-medium uppercase tracking-wider text-ink/50 mb-1.5">
                      {t('settings.linkEmail.codeLabel')}
                    </label>
                    <p className="text-[12px] text-ink/40 mb-2">
                      {t('settings.linkEmail.codeHint', {email})}
                    </p>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder={t('settings.linkEmail.codePlaceholder')}
                      className="admin-input text-center text-lg tracking-[0.3em]"
                      onKeyDown={(e) => e.key === 'Enter' && handleLink()}
                    />
                    <button
                      onClick={handleLink}
                      disabled={linking || code.length !== 6}
                      className="mt-3 w-full lux-btn-primary disabled:opacity-50"
                    >
                      {linking ? t('settings.linkEmail.linking') : t('settings.linkEmail.submit')}
                    </button>
                    <div className="mt-2 flex items-center justify-center gap-2 text-[12px]">
                      <span className="text-ink/40">{t('settings.linkEmail.didntReceive')}</span>
                      {cooldown > 0 ? (
                        <span className="text-ink/30">
                          {t('settings.linkEmail.resendIn', {seconds: cooldown})}
                        </span>
                      ) : (
                        <button
                          onClick={handleResend}
                          disabled={sending}
                          className="text-[#D4A574] hover:text-[#D4A574]/80 transition-colors"
                        >
                          {t('settings.linkEmail.resend')}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {error && <p className="text-[13px] text-red-400">{error}</p>}
              </div>
            )}
          </div>

          {/* ── Newsletter Preferences ── */}
          <div className="paper-card p-6 space-y-5">
            <div>
              <h2 className="font-display text-[16px] font-semibold text-ink tracking-wide">
                {t('settings.newsletter.title')}
              </h2>
              <p className="mt-1 text-[13px] text-ink/50">
                {t('settings.newsletter.description')}
              </p>
            </div>

            {!emailLinked && !success ? (
              <p className="text-[13px] text-ink/40 italic">
                {t('settings.newsletter.needEmail')}
              </p>
            ) : (
              <div className="space-y-4">
                <ToggleRow
                  label={t('settings.newsletter.promos')}
                  hint={t('settings.newsletter.promosHint')}
                  checked={promos}
                  disabled={savingPrefs}
                  onChange={(v) => handleToggle('promos', v)}
                />
                <ToggleRow
                  label={t('settings.newsletter.collections')}
                  hint={t('settings.newsletter.collectionsHint')}
                  checked={collections}
                  disabled={savingPrefs}
                  onChange={(v) => handleToggle('collections', v)}
                />
                <ToggleRow
                  label={t('settings.newsletter.projects')}
                  hint={t('settings.newsletter.projectsHint')}
                  checked={projects}
                  disabled={savingPrefs}
                  onChange={(v) => handleToggle('projects', v)}
                />
              </div>
            )}
          </div>

          {/* ── Sign out ── */}
          <div className="paper-card p-6">
            <button
              onClick={logout}
              className="w-full rounded-full border border-ink/20 bg-transparent px-6 py-3.5 text-sm font-medium uppercase tracking-wider text-ink transition-all duration-300 hover:bg-ink/5 hover:border-ink/40"
            >
              {t('settings.signOut')}
            </button>
          </div>

          <div className="text-center">
            <Link
              href={`/${locale}/account`}
              className="inline-flex items-center gap-2 text-sm text-ink-soft transition-colors hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              {t('settings.backToProfile')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({label, hint, checked, disabled, onChange}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[14px] text-ink/80 font-medium">{label}</p>
        <p className="text-[12px] text-ink/40 mt-0.5">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 ${
          checked ? 'bg-[#D4A574]' : 'bg-ink/15'
        } ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 mt-0.5 ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

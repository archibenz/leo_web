'use client';

import {useEffect, useState, useCallback} from 'react';
import {useTranslations, useLocale} from 'next-intl';
import {useRouter} from 'next/navigation';
import {useAuth} from '../../../../contexts';
import HeroShaderBackgroundClient from '../../../../components/HeroShaderBackgroundClient';
import Link from 'next/link';

type LinkStep = 'email' | 'code' | 'password';

export default function SettingsPage() {
  const t = useTranslations('account');
  const locale = useLocale();
  const router = useRouter();
  const {user, isAuthenticated, isLoading, logout, sendCode, linkEmail} = useAuth();

  // Link email form state
  const [linkStep, setLinkStep] = useState<LinkStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [linking, setLinking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/${locale}/account`);
    }
  }, [isAuthenticated, isLoading, locale, router]);

  // Cooldown timer for resend
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
      if (result.error === 'invalid_email') {
        setError(t('errors.invalidEmail'));
      } else {
        setError(t('errors.sendCodeFailed'));
      }
    }
  }, [email, sendCode, t]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0) return;
    setSending(true);
    const result = await sendCode(email);
    setSending(false);
    if (result.success) {
      setCooldown(60);
    }
  }, [email, cooldown, sendCode]);

  const handleCodeSubmit = useCallback(() => {
    if (code.trim().length !== 6) {
      setError(t('errors.invalidCode'));
      return;
    }
    setError('');
    setLinkStep('password');
  }, [code, t]);

  const handleLink = useCallback(async () => {
    setError('');
    if (password.length < 6) {
      setError(t('errors.passwordTooShort'));
      return;
    }
    setLinking(true);
    const result = await linkEmail(email, password, code);
    setLinking(false);
    if (result.success) {
      setSuccess(true);
    } else {
      if (result.error === 'email_already_linked') {
        setError(t('settings.linkEmail.alreadyLinked'));
      } else if (result.error === 'invalid_code') {
        setError(t('errors.invalidCode'));
        setLinkStep('code');
      } else if (result.error === 'invalid_email') {
        setError(t('errors.invalidEmail'));
      } else if (result.error === 'password_too_short') {
        setError(t('errors.passwordTooShort'));
      } else {
        setError(t('errors.genericError'));
      }
    }
  }, [email, password, code, linkEmail, t]);

  if (isLoading) {
    return (
      <div className="relative min-h-screen pt-28 pb-6">
        <HeroShaderBackgroundClient />
        <div className="relative z-10 flex min-h-[60vh] items-center justify-center px-6 lg:px-8">
          <div className="paper-card p-10 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="mt-4 text-ink-soft">{t('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const emailAlreadyLinked = !!user?.email;

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

          {/* Link Email Section */}
          {!emailAlreadyLinked && (
            <div className="paper-card p-6 space-y-5">
              <div>
                <h2 className="font-display text-[16px] font-semibold text-ink tracking-wide">
                  {t('settings.linkEmail.title')}
                </h2>
                <p className="mt-1 text-[13px] text-ink/50">
                  {t('settings.linkEmail.description')}
                </p>
              </div>

              {success ? (
                <div className="rounded-xl bg-[#D4A574]/10 border border-[#D4A574]/20 px-4 py-3">
                  <p className="text-[14px] text-[#D4A574] font-medium">
                    {t('settings.linkEmail.success')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Step 1: Email */}
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

                  {/* Step 2: Code */}
                  {(linkStep === 'code' || linkStep === 'password') && (
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
                        disabled={linkStep === 'password'}
                        className="admin-input text-center text-lg tracking-[0.3em] disabled:opacity-50"
                        onKeyDown={(e) => e.key === 'Enter' && linkStep === 'code' && handleCodeSubmit()}
                      />
                      {linkStep === 'code' && (
                        <>
                          <button
                            onClick={handleCodeSubmit}
                            disabled={code.length !== 6}
                            className="mt-3 w-full lux-btn-primary disabled:opacity-50"
                          >
                            {t('buttons.continue')}
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
                        </>
                      )}
                    </div>
                  )}

                  {/* Step 3: Password */}
                  {linkStep === 'password' && (
                    <div>
                      <label className="block text-[12px] font-medium uppercase tracking-wider text-ink/50 mb-1.5">
                        {t('settings.linkEmail.passwordLabel')}
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('settings.linkEmail.passwordPlaceholder')}
                        className="admin-input"
                        onKeyDown={(e) => e.key === 'Enter' && handleLink()}
                      />
                      <button
                        onClick={handleLink}
                        disabled={linking || password.length < 6}
                        className="mt-3 w-full lux-btn-primary disabled:opacity-50"
                      >
                        {linking ? t('settings.linkEmail.linking') : t('settings.linkEmail.submit')}
                      </button>
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <p className="text-[13px] text-red-400">{error}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Already linked info */}
          {emailAlreadyLinked && (
            <div className="paper-card p-6 space-y-3">
              <h2 className="font-display text-[16px] font-semibold text-ink tracking-wide">
                Email
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[14px] text-ink/70">{user?.email}</span>
                <span className="inline-flex items-center rounded-full bg-[#D4A574]/10 px-2 py-0.5 text-[11px] font-medium text-[#D4A574]">
                  {t('profile.emailVerified')}
                </span>
              </div>
            </div>
          )}

          {/* Sign out */}
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

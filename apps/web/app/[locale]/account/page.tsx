'use client';

import {useState, useEffect, useRef, useCallback} from 'react';
import {useTranslations, useLocale} from 'next-intl';
import {useRouter} from 'next/navigation';
import {useAuth, useFavorites, useCart} from '../../../contexts';
import {apiFetch} from '../../../lib/api';
import HeroShaderBackgroundClient from '../../../components/HeroShaderBackgroundClient';
import Spinner from '../../../components/ui/Spinner';
import Link from 'next/link';

type RegStep = 'email' | 'code' | 'details';

export default function AccountPage() {
  const t = useTranslations('account');
  const locale = useLocale();
  const router = useRouter();
  const {user, isAuthenticated, isLoading, isAdmin, login, sendCode, register, initTelegramAuth, loginWithToken, logout, validateEmail} = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tgLoading, setTgLoading] = useState(false);
  const [tgPolling, setTgPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Registration multi-step state
  const [regStep, setRegStep] = useState<RegStep>('email');
  const [regEmail, setRegEmail] = useState('');
  const [regCode, setRegCode] = useState('');
  const [regName, setRegName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPromos, setRegPromos] = useState(true);
  const [regCollections, setRegCollections] = useState(true);
  const [regProjects, setRegProjects] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    localStorage.removeItem('tg_init_token');
    setTgPolling(false);
    setTgLoading(false);
  }, []);

  const tryPoll = useCallback(async (initToken: string): Promise<boolean> => {
    try {
      const data = await apiFetch<{token: string}>(`/api/auth/telegram/poll?token=${encodeURIComponent(initToken)}`);
      if (data.token) {
        await loginWithToken(data.token);
        return true;
      }
    } catch {
      // pending or expired
    }
    return false;
  }, [loginWithToken]);

  const startPolling = useCallback((initToken: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    setTgPolling(true);
    setTgLoading(true);

    let attempts = 0;
    const maxAttempts = 150;

    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        stopPolling();
        return;
      }
      const success = await tryPoll(initToken);
      if (success) stopPolling();
    }, 2000);
  }, [stopPolling, tryPoll]);

  useEffect(() => {
    const savedToken = localStorage.getItem('tg_init_token');
    if (savedToken && !isAuthenticated) {
      tryPoll(savedToken).then(success => {
        if (success) {
          localStorage.removeItem('tg_init_token');
        } else {
          startPolling(savedToken);
        }
      });
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible') return;
      const savedToken = localStorage.getItem('tg_init_token');
      if (!savedToken) return;
      const success = await tryPoll(savedToken);
      if (success) stopPolling();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [tryPoll, stopPolling]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleModeSwitch = (loginMode: boolean) => {
    if (loginMode === isLoginMode) return;
    setIsTransitioning(true);
    setError('');
    setRegStep('email');
    setRegCode('');

    setTimeout(() => {
      setIsLoginMode(loginMode);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 200);
  };

  const getErrorMessage = (errorCode: string): string => {
    const errorMessages: Record<string, string> = {
      'invalid_email': t('errors.invalidEmail'),
      'user_not_found': t('errors.userNotFound'),
      'invalid_password': t('errors.invalidPassword'),
      'password_too_short': t('errors.passwordTooShort'),
      'email_exists': t('errors.emailExists'),
      'registration_failed': t('errors.registerFailed'),
      'invalid_credentials': t('errors.invalidCredentials'),
      'login_failed': t('errors.loginFailed'),
      'send_code_failed': t('errors.sendCodeFailed'),
      'invalid_code': t('errors.invalidCode'),
      'name_required': t('errors.nameRequired'),
      'name_length': t('errors.nameLength'),
    };
    return errorMessages[errorCode] || t('errors.genericError');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError(t('errors.invalidEmail'));
      return;
    }

    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (!result.success && result.error) {
        setError(getErrorMessage(result.error));
      }
    } catch {
      setError(t('errors.genericError'));
    } finally {
      setSubmitting(false);
    }
  };

  // Registration step handlers
  const handleRegSendCode = async () => {
    setError('');
    if (!validateEmail(regEmail)) {
      setError(t('errors.invalidEmail'));
      return;
    }
    setSubmitting(true);
    const result = await sendCode(regEmail);
    setSubmitting(false);
    if (result.success) {
      setRegStep('code');
      setCooldown(60);
    } else {
      setError(getErrorMessage(result.error || 'send_code_failed'));
    }
  };

  const handleRegVerifyCode = () => {
    setError('');
    if (regCode.trim().length !== 6) {
      setError(t('errors.invalidCode'));
      return;
    }
    setRegStep('details');
  };

  const handleRegResend = async () => {
    if (cooldown > 0) return;
    setSubmitting(true);
    const result = await sendCode(regEmail);
    setSubmitting(false);
    if (result.success) setCooldown(60);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    setSubmitting(true);
    try {
      const result = await register({
        email: regEmail,
        code: regCode,
        firstName: regName,
        password: regPassword,
        newsletter: regPromos || regCollections || regProjects,
        newsletterPromos: regPromos,
        newsletterCollections: regCollections,
        newsletterProjects: regProjects,
        privacyAccepted: true,
      });
      if (!result.success && result.error) {
        if (result.error === 'invalid_code') {
          setRegStep('code');
        }
        setError(getErrorMessage(result.error));
      }
    } catch {
      setError(t('errors.genericError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTelegramLogin = async () => {
    setTgLoading(true);
    setError('');
    try {
      const result = await initTelegramAuth();
      if (result.success && result.deepLink && result.initToken) {
        localStorage.setItem('tg_init_token', result.initToken);
        window.location.href = result.deepLink;
      } else {
        setError(t('errors.genericError'));
        setTgLoading(false);
      }
    } catch {
      setError(t('errors.genericError'));
      setTgLoading(false);
    }
  };

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

  // Logged in state
  if (isAuthenticated && user) {
    const memberSinceDate = user.createdAt
      ? new Intl.DateTimeFormat(locale, {year: 'numeric', month: 'long'}).format(new Date(user.createdAt))
      : null;

    return <AuthenticatedProfile
      user={user} locale={locale} isAdmin={isAdmin} logout={logout}
      memberSinceDate={memberSinceDate} t={t}
    />;
  }

  // Login / Register form
  return (
    <div className="relative min-h-screen pt-28 pb-6">
      <HeroShaderBackgroundClient />
      <div className="relative z-10 flex min-h-[60vh] items-center justify-center px-6 lg:px-8">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <p className="capsule-tag mx-auto">{t('tag')}</p>
            <h1
              className={`mt-4 font-display text-ink text-[clamp(1.75rem,4vw,2.75rem)] transition-all duration-300 ${
                isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
              }`}
            >
              {isLoginMode ? t('signIn') : t('signUp')}
            </h1>
          </div>

          <div className="paper-card overflow-hidden p-8">
            {/* Mode toggle tabs */}
            <div className="relative mb-8 flex rounded-full bg-ink/5 p-1">
              <div
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-button transition-all duration-300 ease-out"
                style={{left: isLoginMode ? '4px' : 'calc(50% + 0px)'}}
              />
              <button type="button" onClick={() => handleModeSwitch(true)}
                className={`relative z-10 flex-1 py-3 text-sm font-medium uppercase tracking-wider transition-colors duration-300 ${isLoginMode ? 'text-ink' : 'text-ink-soft hover:text-ink'}`}
              >{t('tabs.login')}</button>
              <button type="button" onClick={() => handleModeSwitch(false)}
                className={`relative z-10 flex-1 py-3 text-sm font-medium uppercase tracking-wider transition-colors duration-300 ${!isLoginMode ? 'text-ink' : 'text-ink-soft hover:text-ink'}`}
              >{t('tabs.register')}</button>
            </div>

            <div className={`transition-all duration-300 ${isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
              {/* ── LOGIN FORM ── */}
              {isLoginMode && (
                <form onSubmit={handleLoginSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-sm uppercase tracking-widest text-ink-soft">{t('form.email')}</label>
                    <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)}
                      className="w-full rounded-xl border border-ink/20 bg-paper/50 px-5 py-4 text-base text-ink outline-none transition-all duration-200 focus:border-accent focus:bg-paper placeholder:transition-opacity placeholder:duration-200"
                      placeholder={emailFocused ? '' : t('form.emailPlaceholder')} required />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="password" className="block text-sm uppercase tracking-widest text-ink-soft">{t('form.password')}</label>
                    <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setPasswordFocused(true)} onBlur={() => setPasswordFocused(false)}
                      className="w-full rounded-xl border border-ink/20 bg-paper/50 px-5 py-4 text-base text-ink outline-none transition-all duration-200 focus:border-accent focus:bg-paper placeholder:transition-opacity placeholder:duration-200"
                      placeholder={passwordFocused ? '' : t('form.passwordPlaceholder')} minLength={6} />
                  </div>

                  {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}

                  <button type="submit" disabled={submitting}
                    className="relative w-full overflow-hidden rounded-full bg-button px-8 py-4 text-base font-medium uppercase tracking-wider text-ink transition-all duration-300 hover:bg-button/85 hover:shadow-lg hover:shadow-button/25 disabled:opacity-50">
                    <span className={`inline-block transition-all duration-300 ${submitting ? 'opacity-0' : 'opacity-100'}`}>{t('buttons.signIn')}</span>
                    {submitting && <span className="absolute inset-0 flex items-center justify-center"><Spinner size="sm" /></span>}
                  </button>
                </form>
              )}

              {/* ── REGISTER FORM — multi-step ── */}
              {!isLoginMode && (
                <div className="space-y-5">
                  {/* Step 1: Email */}
                  {regStep === 'email' && (
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="block text-sm uppercase tracking-widest text-ink-soft">{t('form.email')}</label>
                        <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                          className="w-full rounded-xl border border-ink/20 bg-paper/50 px-5 py-4 text-base text-ink outline-none transition-all duration-200 focus:border-accent focus:bg-paper"
                          placeholder={t('form.emailPlaceholder')} required
                          onKeyDown={(e) => e.key === 'Enter' && handleRegSendCode()} />
                        <p className="text-[12px] text-ink/40">{t('register.emailHint')}</p>
                      </div>

                      {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}

                      <button type="button" onClick={handleRegSendCode} disabled={submitting || !regEmail.trim()}
                        className="relative w-full overflow-hidden rounded-full bg-button px-8 py-4 text-base font-medium uppercase tracking-wider text-ink transition-all duration-300 hover:bg-button/85 disabled:opacity-50">
                        {submitting ? <Spinner size="sm" className="mx-auto" /> : t('buttons.continue')}
                      </button>
                    </div>
                  )}

                  {/* Step 2: Code */}
                  {regStep === 'code' && (
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="block text-sm uppercase tracking-widest text-ink-soft">{t('confirm.codeLabel')}</label>
                        <p className="text-[12px] text-ink/40">{t('confirm.subtitle', {email: regEmail})}</p>
                        <input type="text" inputMode="numeric" maxLength={6}
                          value={regCode} onChange={(e) => setRegCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="w-full rounded-xl border border-ink/20 bg-paper/50 px-5 py-4 text-center text-xl tracking-[0.3em] text-ink outline-none transition-all duration-200 focus:border-accent focus:bg-paper"
                          placeholder={t('settings.linkEmail.codePlaceholder')}
                          onKeyDown={(e) => e.key === 'Enter' && handleRegVerifyCode()} />
                      </div>

                      {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}

                      <button type="button" onClick={handleRegVerifyCode} disabled={regCode.length !== 6}
                        className="relative w-full overflow-hidden rounded-full bg-button px-8 py-4 text-base font-medium uppercase tracking-wider text-ink transition-all duration-300 hover:bg-button/85 disabled:opacity-50">
                        {t('buttons.continue')}
                      </button>

                      <div className="flex items-center justify-center gap-2 text-[12px]">
                        <span className="text-ink/40">{t('confirm.didntReceive')}</span>
                        {cooldown > 0 ? (
                          <span className="text-ink/30">{t('confirm.resendIn', {seconds: cooldown})}</span>
                        ) : (
                          <button onClick={handleRegResend} disabled={submitting} className="text-accent hover:text-accent/80 transition-colors">
                            {t('confirm.resend')}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 3: Name, password, newsletter prefs */}
                  {regStep === 'details' && (
                    <form onSubmit={handleRegisterSubmit} className="space-y-5">
                      <div className="space-y-2">
                        <label className="block text-sm uppercase tracking-widest text-ink-soft">{t('form.name')}</label>
                        <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)}
                          className="w-full rounded-xl border border-ink/20 bg-paper/50 px-5 py-4 text-base text-ink outline-none transition-all duration-200 focus:border-accent focus:bg-paper"
                          placeholder={t('form.namePlaceholder')} minLength={2} maxLength={40} required />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm uppercase tracking-widest text-ink-soft">{t('form.password')}</label>
                        <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
                          className="w-full rounded-xl border border-ink/20 bg-paper/50 px-5 py-4 text-base text-ink outline-none transition-all duration-200 focus:border-accent focus:bg-paper"
                          placeholder={t('form.passwordPlaceholder')} minLength={6} required />
                      </div>

                      {/* Newsletter toggles */}
                      <div className="space-y-3 rounded-xl border border-ink/10 bg-ink/[0.02] p-4">
                        <p className="text-[12px] font-medium uppercase tracking-wider text-ink/50">{t('settings.newsletter.title')}</p>
                        <ToggleRow label={t('settings.newsletter.promos')} checked={regPromos} onChange={setRegPromos} />
                        <ToggleRow label={t('settings.newsletter.collections')} checked={regCollections} onChange={setRegCollections} />
                        <ToggleRow label={t('settings.newsletter.projects')} checked={regProjects} onChange={setRegProjects} />
                      </div>

                      {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}

                      <button type="submit" disabled={submitting}
                        className="relative w-full overflow-hidden rounded-full bg-button px-8 py-4 text-base font-medium uppercase tracking-wider text-ink transition-all duration-300 hover:bg-button/85 disabled:opacity-50">
                        <span className={`inline-block transition-all duration-300 ${submitting ? 'opacity-0' : 'opacity-100'}`}>{t('buttons.signUp')}</span>
                        {submitting && <span className="absolute inset-0 flex items-center justify-center"><Spinner size="sm" /></span>}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Telegram login */}
            <div className="mt-4">
              <div className="relative flex items-center py-2">
                <div className="flex-1 border-t border-ink/10" />
                <span className="mx-4 text-xs uppercase tracking-widest text-ink-soft">{t('footer.or')}</span>
                <div className="flex-1 border-t border-ink/10" />
              </div>
              {tgPolling ? (
                <div className="w-full rounded-2xl border border-accent/30 bg-accent/5 px-6 py-4 text-center space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <Spinner size="sm" />
                    <span className="text-sm text-ink">{t('buttons.waitingTelegram')}</span>
                  </div>
                  <button type="button" onClick={stopPolling} className="text-xs text-ink-soft underline underline-offset-2 hover:text-ink transition-colors">{t('buttons.cancel')}</button>
                </div>
              ) : (
                <button type="button" onClick={handleTelegramLogin} disabled={tgLoading}
                  className="relative w-full overflow-hidden rounded-full border border-ink/20 bg-paper px-8 py-4 text-base font-medium uppercase tracking-wider text-ink transition-all duration-300 hover:border-accent/40 hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-3">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current text-[#229ED9]" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.932z"/>
                  </svg>
                  {tgLoading ? <Spinner size="sm" /> : t('buttons.telegramLogin')}
                </button>
              )}
            </div>

            <p className="mt-6 text-center text-sm text-ink-soft">
              {isLoginMode ? (
                <>{t('footer.noAccount')}{' '}
                  <button type="button" onClick={() => handleModeSwitch(false)} className="text-accent transition hover:text-accent/80">{t('footer.createOne')}</button>
                </>
              ) : (
                <>{t('footer.hasAccount')}{' '}
                  <button type="button" onClick={() => handleModeSwitch(true)} className="text-accent transition hover:text-accent/80">{t('footer.signInLink')}</button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthenticatedProfile({user, locale, isAdmin, logout, memberSinceDate, t}: {
  user: {name: string; surname?: string | null; email?: string | null; createdAt?: string | null};
  locale: string; isAdmin: boolean; logout: () => void; memberSinceDate: string | null;
  t: (key: string, values?: Record<string, string>) => string;
}) {
  const [activeTab, setActiveTab] = useState<'profile' | 'favorites'>('profile');
  const {items: favoriteItems, removeItem: removeFavorite, isLoading: favLoading} = useFavorites();
  const {addItem: addToCart} = useCart();
  const favT = useTranslations('favorites');

  const tabClass = (active: boolean) =>
    `text-sm font-display uppercase tracking-[0.12em] pb-1 transition-colors duration-200 ${
      active ? 'text-accent border-b border-accent' : 'text-ink/60 hover:text-ink'
    }`;

  return (
    <div className="relative min-h-screen pt-28 pb-6">
      <HeroShaderBackgroundClient />
      <div className="relative z-10 mx-auto max-w-4xl px-6 lg:px-8">

        {/* ── Top Navigation Tabs ── */}
        <nav className="flex items-center justify-center gap-6 sm:gap-8 py-4 mb-10">
          <button type="button" onClick={() => setActiveTab('profile')} className={tabClass(activeTab === 'profile')}>{t('profile.name')}</button>
          <span className="text-sm font-display uppercase tracking-[0.12em] text-ink/25 cursor-default">{t('profile.orders')}</span>
          <button type="button" onClick={() => setActiveTab('favorites')} className={tabClass(activeTab === 'favorites')}>{t('profile.favorites')}</button>
          <Link href={`/${locale}/account/settings`} className="text-sm font-display uppercase tracking-[0.12em] text-ink/60 transition-colors duration-200 hover:text-ink">{t('profile.settings')}</Link>
          {isAdmin && (
            <Link href={`/${locale}/admin`} className="text-sm font-display uppercase tracking-[0.12em] text-accent/70 transition-colors duration-200 hover:text-accent">{t('profile.admin')}</Link>
          )}
        </nav>

        <div className="h-px bg-gradient-to-r from-transparent via-ink/10 to-transparent" />

        {/* ── Profile Header: Avatar + Name + Member Since (NO card background) ── */}
        <div className="flex items-center gap-6 py-10">
          <div className="flex-shrink-0 flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-ink/[0.06] border border-ink/10">
            <svg viewBox="0 0 24 24" className="h-9 w-9 sm:h-10 sm:w-10 text-ink/30" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-ink text-[clamp(1.5rem,3.5vw,2.25rem)]">
              {user.name}{user.surname ? ` ${user.surname}` : ''}
            </h1>
            {memberSinceDate && (
              <p className="mt-1 text-sm text-ink-soft">
                {t('profile.memberSince', {date: memberSinceDate})}
              </p>
            )}
          </div>
        </div>

        {/* ── Content Card ── */}
        <div className="paper-card p-6 sm:p-8">
          {activeTab === 'profile' && (
            <>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs uppercase tracking-[0.15em] text-ink-soft">{t('profile.email')}</span>
                <div className="flex items-center gap-2">
                  {user.email ? (
                    <>
                      <span className="text-sm text-ink">{user.email}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-green-400">
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        {t('profile.emailVerified')}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-ink-soft italic">{t('profile.emailNotLinked')}</span>
                  )}
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-ink/8 to-transparent my-4" />

              <button
                type="button"
                onClick={logout}
                className="text-sm text-ink/40 transition-colors duration-300 hover:text-ink/70"
              >
                {t('profile.logOut')}
              </button>
            </>
          )}

          {activeTab === 'favorites' && (
            <>
              {favLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : favoriteItems.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ink/5">
                    <svg viewBox="0 0 24 24" className="h-8 w-8 text-ink/20" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                  </div>
                  <p className="font-display text-lg text-ink">{favT('empty.title')}</p>
                  <p className="text-sm text-ink-soft">{favT('empty.subtitle')}</p>
                  <Link
                    href={`/${locale}/shop`}
                    className="inline-block rounded-full bg-button px-6 py-3 text-sm font-medium uppercase tracking-wider text-ink transition-all duration-300 hover:bg-button/85"
                  >
                    {favT('empty.cta')}
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {favoriteItems.map((item) => (
                    <div key={item.id} className="group relative">
                      <Link href={`/${locale}/product/${item.id}`} className="block">
                        <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-paperMuted">
                          {item.image ? (
                            <img src={item.image} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-paperMuted to-paper">
                              <svg viewBox="0 0 24 24" className="h-12 w-12 text-ink/10" fill="none" stroke="currentColor" strokeWidth="0.8">
                                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                              </svg>
                            </div>
                          )}
                          <button
                            onClick={(e) => { e.preventDefault(); removeFavorite(item.id); }}
                            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-paper/80 text-ink-soft backdrop-blur-sm transition-all hover:bg-paper hover:text-ink"
                            aria-label={favT('remove')}
                          >
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          </button>
                        </div>
                      </Link>
                      <p className="mt-2 text-sm text-ink truncate">{item.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}

function ToggleRow({label, checked, onChange}: {label: string; checked: boolean; onChange: (v: boolean) => void}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-ink/70">{label}</span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 cursor-pointer ${checked ? 'bg-[#D4A574]' : 'bg-ink/15'}`}>
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 mt-0.5 ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

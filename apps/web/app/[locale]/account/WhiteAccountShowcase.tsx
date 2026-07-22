'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {useWhiteBag} from '../../../hooks/useWhiteBag';
import {useWhiteFavourites} from '../../../hooks/useWhiteFavourites';
import {useWhiteAuth, whiteLogin, whiteSendCode, whiteRegister, whiteLogout, WHITE_PASSWORD_RE} from '../../../hooks/useWhiteAuth';
import WhiteHeader from '../WhiteHeader';
import WhiteHeaderActions from '../WhiteHeaderActions';
import WhiteFooter from '../WhiteFooter';
import {INK, MUTED, HAIR, SIGNAL} from '../wv-palette';

// Account over the existing auth backend: sign-in (email + password) and
// sign-up (email → emailed code → name + password), in the White DNA. The JWT
// is shared with the rest of the site, so a session works everywhere.

const FIELD = 'min-h-11 w-full border-b bg-transparent pb-2 pt-3 text-[15px] outline-none placeholder:text-[#776e64]';

export default function WhiteAccountShowcase({locale}: {locale: string}) {
  const {count} = useWhiteBag();
  const {count: favCount} = useWhiteFavourites();
  const {user, ready} = useWhiteAuth();
  const t = useTranslations('white.account');

  const [tab, setTab] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [consented, setConsented] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await whiteLogin(email, password);
    if (!r.ok) setError(t('errCredentials'));
    setBusy(false);
  };

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    const r = await whiteSendCode(email);
    if (r.ok) setCodeSent(true);
    else setError(t('errCode'));
    setBusy(false);
  };

  const submitSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const name = firstName.trim();
    if (name.length < 2 || name.length > 40) {
      setError(t('errName'));
      return;
    }
    if (!WHITE_PASSWORD_RE.test(password)) {
      setError(t('errPassword'));
      return;
    }
    setBusy(true);
    const r = await whiteRegister({email, code, firstName: name, password});
    if (!r.ok) setError(t('errRegister'));
    setBusy(false);
  };

  return (
    <>

      <main id="wv-main" tabIndex={-1} style={{outline: 'none'}} className="mx-auto w-full max-w-[560px] flex-1 px-6 py-14 sm:px-10 sm:py-24">
        <p className="mb-7 text-[11px] uppercase tracking-[0.32em]" style={{color: MUTED}}>{t('eyebrow')}</p>

        {!ready ? null : user ? (
          <div className="wv-rise">
            <h1 className="font-display text-[clamp(38px,calc(3vw_+_26px),56px)] font-light leading-[1] tracking-[-0.01em]">
              {t('hello')} {user.name}
            </h1>
            <p className="mt-5 text-[13px]" style={{color: MUTED}}>
              {t('loggedInAs')} <span style={{color: INK}}>{user.email}</span>
            </p>

            <p className="mt-12 text-[11px] uppercase tracking-[0.2em]" style={{color: MUTED}}>{t('links')}</p>
            <div className="mt-3 divide-y border-y" style={{borderColor: HAIR}}>
              <a href={`/${locale}/favourites`} className="wv-menu-link flex min-h-12 items-center text-[14px]">
                {t('favourites')}{favCount > 0 ? ` · ${favCount}` : ''}
              </a>
              <a href={`/${locale}/bag`} className="wv-menu-link flex min-h-12 items-center text-[14px]">
                {t('bag')}{count > 0 ? ` · ${count}` : ''}
              </a>
            </div>

            <button
              type="button"
              onClick={() => whiteLogout()}
              className="wv-link mt-10 inline-flex min-h-11 items-center text-[12px] uppercase tracking-[0.18em]"
              style={{color: MUTED}}
            >
              {t('signOut')}
            </button>
          </div>
        ) : (
          <div className="wv-rise">
            <h1 className="font-display text-[clamp(38px,calc(3vw_+_26px),56px)] font-light leading-[1] tracking-[-0.01em]">{t('title')}</h1>
            <p className="mt-5 max-w-md text-[14px] leading-relaxed" style={{color: MUTED}}>{t('intro')}</p>

            <div className="mt-10 flex gap-6 border-b" style={{borderColor: HAIR}} role="tablist">
              {(['in', 'up'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={tab === k}
                  onClick={() => {
                    setTab(k);
                    setError(null);
                  }}
                  className="-mb-px min-h-11 border-b pb-2 text-[12px] uppercase tracking-[0.18em]"
                  style={{borderColor: tab === k ? INK : 'transparent', color: tab === k ? INK : MUTED}}
                >
                  {k === 'in' ? t('signIn') : t('signUp')}
                </button>
              ))}
            </div>

            {tab === 'in' ? (
              <form onSubmit={submitSignIn} className="mt-8 flex flex-col gap-5">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-[0.2em]" style={{color: MUTED}}>{t('email')}</span>
                  <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD} style={{borderColor: HAIR}} />
                </label>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-[0.2em]" style={{color: MUTED}}>{t('password')}</span>
                  <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={FIELD} style={{borderColor: HAIR}} />
                </label>
                <button type="submit" disabled={busy} className="wv-btn mt-4 inline-flex items-center justify-center self-start px-9 py-4 text-[12px] uppercase tracking-[0.2em]">
                  {t('signInCta')}
                </button>
              </form>
            ) : (
              <form onSubmit={submitSignUp} className="mt-8 flex flex-col gap-5">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-[0.2em]" style={{color: MUTED}}>{t('email')}</span>
                  <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD} style={{borderColor: HAIR}} />
                </label>
                {!codeSent ? (
                  <button type="button" onClick={sendCode} disabled={busy || !email} className="wv-btn mt-2 inline-flex items-center justify-center self-start px-9 py-4 text-[12px] uppercase tracking-[0.2em]">
                    {t('sendCode')}
                  </button>
                ) : (
                  <>
                    <p aria-live="polite" className="text-[12px]" style={{color: MUTED}}>{t('codeSent')}</p>
                    <label className="block">
                      <span className="text-[11px] uppercase tracking-[0.2em]" style={{color: MUTED}}>{t('code')}</span>
                      <input inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} className={FIELD} style={{borderColor: HAIR}} />
                    </label>
                    <label className="block">
                      <span className="text-[11px] uppercase tracking-[0.2em]" style={{color: MUTED}}>{t('firstName')}</span>
                      <input autoComplete="given-name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={FIELD} style={{borderColor: HAIR}} />
                    </label>
                    <label className="block">
                      <span className="text-[11px] uppercase tracking-[0.2em]" style={{color: MUTED}}>{t('password')}</span>
                      <input type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={FIELD} style={{borderColor: HAIR}} />
                    </label>
                    {/* 152-ФЗ ст.9: согласие фиксируется действием — required-чекбокс,
                        и whiteRegister шлёт privacyAccepted на бэкенд. */}
                    <label className="flex items-start gap-3 text-[11.5px] leading-relaxed" style={{color: MUTED}}>
                      <input
                        type="checkbox"
                        required
                        checked={consented}
                        onChange={(e) => setConsented(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#1c1714]"
                      />
                      <span>
                        {t.rich('consent', {
                          policy: (chunks) => (
                            <a href={`/${locale}/privacy`} className="wv-link" style={{color: INK}}>{chunks}</a>
                          ),
                          offer: (chunks) => (
                            <a href={`/${locale}/offer`} className="wv-link" style={{color: INK}}>{chunks}</a>
                          ),
                        })}
                      </span>
                    </label>
                    <button type="submit" disabled={busy} className="wv-btn mt-4 inline-flex items-center justify-center self-start px-9 py-4 text-[12px] uppercase tracking-[0.2em]">
                      {t('signUpCta')}
                    </button>
                  </>
                )}
              </form>
            )}

            <p aria-live="polite" className="mt-5 min-h-5 text-[13px]" style={{color: SIGNAL}}>
              {error ?? ''}
            </p>
          </div>
        )}
      </main>
    </>
  );
}
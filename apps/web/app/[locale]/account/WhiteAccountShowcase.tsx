'use client';

import {useState, useRef, useEffect} from 'react';
import Image from 'next/image';
import {useTranslations} from 'next-intl';
import {useWhiteBag} from '../../../hooks/useWhiteBag';
import {useWhiteFavourites} from '../../../hooks/useWhiteFavourites';
import {useWhiteAuth, whiteLogin, whiteSendCode, whiteRegister, whiteLogout, WHITE_PASSWORD_RE} from '../../../hooks/useWhiteAuth';
import {Button} from '../../../components/ui/button';
import WhiteTelegramLogin from '../WhiteTelegramLogin';
import WhiteFloatingPaths from '../WhiteFloatingPaths';
import {WhiteAtGlyph} from '../wv-icons';
import {INK, MUTED, HAIR, SIGNAL, FOOT} from '../wv-palette';

// Account over the existing auth backend: sign-in (email + password) and
// sign-up (email → emailed code → name + password), in the White DNA. The JWT
// is shared with the rest of the site, so a session works everywhere.
//
// Composition comes from the Efferd block auth-5: a decorative panel with
// floating paths on one side, the form centred in a narrow column on the
// other, e-mail field with a leading mark, full-width call to action. What the
// block ships and we do not carry — Apple/GitHub/Google sign-in (we have
// e-mail and Telegram, and nothing else is planned), its own logo and icons,
// its InputGroup primitive and its passive legal line (sign-up here records
// consent with a required checkbox, which is stronger).

const FIELD = 'wv-field block min-h-11 w-full border-b bg-transparent pb-2 pt-3 text-[15px] outline-none placeholder:text-[#776e64]';
// The e-mail row draws the rule on the wrapper instead of the input, so the
// mark sits inside the field and the rule still darkens on focus (.wv-fieldline).
const FIELD_ROW = 'wv-fieldline flex min-h-11 w-full items-center gap-2.5 border-b pb-2 pt-3';
const FIELD_INPUT = 'w-full bg-transparent text-[15px] outline-none placeholder:text-[#776e64]';
const CTA = 'w-full text-[12px] uppercase tracking-[0.2em]';

export default function WhiteAccountShowcase({locale}: {locale: string}) {
  const {count} = useWhiteBag();
  const {count: favCount} = useWhiteFavourites();
  const {user, ready} = useWhiteAuth();
  const t = useTranslations('white.account');
  const tf = useTranslations('white.footer');

  const [tab, setTab] = useState<'in' | 'up'>('in');
  const tabsRef = useRef<HTMLDivElement>(null);
  // The rule under the tabs is positioned from the chosen button's own box, so
  // it slides the real distance between two labels of different widths.
  const [rule, setRule] = useState({left: 0, width: 0});

  useEffect(() => {
    const el = tabsRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (el) setRule({left: el.offsetLeft, width: el.offsetWidth});
  }, [tab, ready, user]);
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

  const emailField = (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.2em]" style={{color: MUTED}}>{t('email')}</span>
      <span className={FIELD_ROW} style={{borderColor: HAIR}}>
        <span style={{color: MUTED}}><WhiteAtGlyph /></span>
        <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD_INPUT} />
      </span>
    </label>
  );

  return (
    <main id="wv-main" tabIndex={-1} style={{outline: 'none'}} className="relative flex-1 lg:grid lg:min-h-[680px] lg:grid-cols-2">
      {/* The block's left half: brand, a line about it, and the paths drifting
          behind both. Decoration only — it carries no link and no control, so
          it stays out of the a11y tree and out of the tab order entirely. */}
      <aside
        data-wv-decor
        aria-hidden="true"
        className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between"
        style={{background: FOOT, borderRight: `1px solid ${HAIR}`}}
      >
        <div className="absolute inset-0">
          <WhiteFloatingPaths position={1} />
          <WhiteFloatingPaths position={-1} />
        </div>
        {/* The paths dissolve into the ground before they reach the brand line,
            the way the block fades its panel into the page. */}
        <div
          className="absolute inset-0"
          style={{background: `linear-gradient(to bottom, transparent 0%, transparent 72%, ${FOOT} 100%)`}}
        />
        <div className="relative p-12">
          <Image src="/logos/name-black.svg" alt="" width={1026} height={162} className="h-[15px] w-auto" />
        </div>
        <div className="relative p-12">
          <p className="font-display text-[clamp(26px,2vw_+_16px,38px)] font-light leading-[1.15] tracking-[-0.01em]">
            {tf('tagline')}
          </p>
        </div>
      </aside>

      <div className="relative flex flex-col justify-center px-6 py-14 sm:px-10 sm:py-20 lg:px-16">
        {/* The block's "top shades" — a barely-there wash from the top corner.
            Ink at 5%, which is the ground the White pages already use. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -right-24 -top-56 h-[560px] w-[460px] rounded-full"
            style={{background: 'radial-gradient(50% 50% at 50% 50%, rgba(28,23,20,0.05) 0%, rgba(28,23,20,0.012) 60%, transparent 100%)'}}
          />
          <div
            className="absolute -right-10 -top-72 h-[620px] w-[240px] rounded-full"
            style={{background: 'radial-gradient(50% 50% at 50% 50%, rgba(28,23,20,0.04) 0%, rgba(28,23,20,0.01) 70%, transparent 100%)'}}
          />
        </div>

        {/* Те же линии на узком экране. Боковой панели здесь нет — её прячет
            сам блок, — а движение как раз то, ради чего блок и выбран, и
            смотрят сайт с телефона. Полоса кончается там, где начинается
            форма, а белая вуаль поверх неё расписана по строкам: над
            надзаголовком она почти глухая, за крупным заголовком отпускает,
            к подзаголовку снова глухая. Смысл в контрасте, а не в красоте
            градиента — мелкий MUTED держит AA на белом с запасом 5.0:1, и
            чернильная линия под ним допустима примерно до 5 % плотности,
            дальше подпись проседает ниже 4.5:1. Заголовок — 38 px чернил,
            ему та же линия на четверти плотности не мешает вовсе. Гашение по
            prefers-reduced-motion общее, оно живёт на .wv-path. */}
        <div
          data-wv-decor
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[155px] overflow-hidden lg:hidden"
        >
          <div className="absolute inset-0">
            <WhiteFloatingPaths position={1} fill />
            <WhiteFloatingPaths position={-1} fill />
          </div>
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.85) 48%, rgba(255,255,255,0.22) 62%, rgba(255,255,255,0.22) 90%, #fff 100%)',
            }}
          />
        </div>

        <div className="relative mx-auto w-full max-w-[420px]">
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
                <span className="wv-link-ink">{t('signOut')}</span>
              </button>
            </div>
          ) : (
            <div className="wv-rise">
              <h1 className="font-display text-[clamp(38px,calc(3vw_+_26px),56px)] font-light leading-[1] tracking-[-0.01em]">{t('title')}</h1>
              <p className="mt-4 text-[13.5px] leading-relaxed" style={{color: MUTED}}>{t('intro')}</p>

              {/* The line under the chosen tab slides between the two rather than
                  blinking off one and on the other, so the eye follows the move.
                  It rides on the row itself, positioned to the active half. */}
              <div ref={tabsRef} className="relative mt-9 flex gap-6 border-b" style={{borderColor: HAIR}} role="tablist">
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
                    className="wv-tab min-h-11 pb-2 text-[12px] uppercase tracking-[0.18em] transition-colors duration-300"
                    style={{color: tab === k ? INK : MUTED}}
                  >
                    {k === 'in' ? t('signIn') : t('signUp')}
                  </button>
                ))}
                <span
                  aria-hidden="true"
                  className="absolute bottom-[-1px] h-px transition-[left,width] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                  style={{background: INK, left: rule.left, width: rule.width}}
                />
              </div>

              {/* The panel is keyed on the tab so React remounts it and the
                  entry animation replays — the two forms trade places instead of
                  one set of fields snapping into another. */}
              <div key={tab} className="wv-tabpanel">
              {tab === 'in' ? (
                <form onSubmit={submitSignIn} className="mt-8 flex flex-col gap-5">
                  {emailField}
                  <label className="block">
                    <span className="text-[11px] uppercase tracking-[0.2em]" style={{color: MUTED}}>{t('password')}</span>
                    <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={FIELD} />
                  </label>
                  <Button type="submit" disabled={busy} variant="white" size="white" className={`${CTA} mt-4`}>
                    {t('signInCta')}
                  </Button>
                </form>
              ) : (
                <form onSubmit={submitSignUp} className="mt-8 flex flex-col gap-5">
                  {emailField}
                  {!codeSent ? (
                    <Button type="button" onClick={sendCode} disabled={busy || !email} variant="white" size="white" className={`${CTA} mt-2`}>
                      {t('sendCode')}
                    </Button>
                  ) : (
                    <>
                      <p aria-live="polite" className="text-[12px]" style={{color: MUTED}}>{t('codeSent')}</p>
                      <label className="block">
                        <span className="text-[11px] uppercase tracking-[0.2em]" style={{color: MUTED}}>{t('code')}</span>
                        <input inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} className={FIELD} />
                      </label>
                      <label className="block">
                        <span className="text-[11px] uppercase tracking-[0.2em]" style={{color: MUTED}}>{t('firstName')}</span>
                        <input autoComplete="given-name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={FIELD} />
                      </label>
                      <label className="block">
                        <span className="text-[11px] uppercase tracking-[0.2em]" style={{color: MUTED}}>{t('password')}</span>
                        <input type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={FIELD} />
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
                              <a href={`/${locale}/privacy`} className="wv-link-inline" style={{color: INK}}>{chunks}</a>
                            ),
                            offer: (chunks) => (
                              <a href={`/${locale}/offer`} className="wv-link-inline" style={{color: INK}}>{chunks}</a>
                            ),
                          })}
                        </span>
                      </label>
                      <Button type="submit" disabled={busy} variant="white" size="white" className={`${CTA} mt-4`}>
                        {t('signUpCta')}
                      </Button>
                    </>
                  )}
                </form>
              )}
              </div>

              <p aria-live="polite" className="mt-5 min-h-5 text-[13px]" style={{color: SIGNAL}}>
                {error ?? ''}
              </p>

              <WhiteTelegramLogin />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

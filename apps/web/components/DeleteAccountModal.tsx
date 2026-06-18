'use client';

import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {motion, AnimatePresence} from 'framer-motion';
import {useTranslations} from 'next-intl';
import BrandLoader from './BrandLoader';
import {useFocusTrap} from '../lib/useFocusTrap';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (credential: string, confirmation: string) => Promise<{success: boolean; error?: string}>;
  onRequestChallenge?: () => Promise<{success: boolean; error?: string}>;
  hasPassword: boolean;
};

export default function DeleteAccountModal({open, onClose, onConfirm, onRequestChallenge, hasPassword}: Props) {
  const t = useTranslations('account.dangerZone.modal');
  const tErrors = useTranslations('account.errors');
  const [credential, setCredential] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [challengeSent, setChallengeSent] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const usesChallenge = !hasPassword && !!onRequestChallenge;

  const formRef = useRef<HTMLFormElement>(null);
  useFocusTrap(formRef, open);

  useEffect(() => {
    if (!open) {
      setCredential('');
      setConfirmText('');
      setError('');
      setSubmitting(false);
      setChallengeSent(false);
      setRequesting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, submitting, onClose]);

  if (typeof document === 'undefined') return null;

  const credentialReady = usesChallenge ? challengeSent && credential.trim().length === 6 : credential.trim().length > 0;
  const canSubmit = !submitting && confirmText === 'DELETE' && credentialReady;

  const handleRequestChallenge = async () => {
    if (!onRequestChallenge || requesting) return;
    setRequesting(true);
    setError('');
    const result = await onRequestChallenge();
    setRequesting(false);
    if (result.success) {
      setChallengeSent(true);
    } else if (result.error === 'network_error') {
      setError(tErrors('networkError'));
    } else {
      setError(tErrors('deleteFailed'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    const result = await onConfirm(credential, confirmText);
    setSubmitting(false);
    if (!result.success) {
      if (result.error === 'invalid_credentials') {
        setError(hasPassword ? tErrors('invalidPasswordForDeletion') : tErrors('invalidTelegramCodeForDeletion'));
      } else if (result.error === 'confirmation_mismatch') {
        setError(tErrors('confirmationMismatch'));
      } else if (result.error === 'network_error') {
        setError(tErrors('networkError'));
      } else {
        setError(tErrors('deleteFailed'));
      }
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}
            className="fixed inset-0 z-[300] bg-black/55 backdrop-blur-sm"
            onClick={() => !submitting && onClose()}
          />
          <motion.div
            initial={{opacity: 0, scale: 0.92, y: 20}}
            animate={{opacity: 1, scale: 1, y: 0}}
            exit={{opacity: 0, scale: 0.92, y: 20}}
            transition={{type: 'spring', mass: 0.5, damping: 16, stiffness: 220}}
            className="fixed inset-0 z-[301] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
          >
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className="paper-card w-full max-w-md p-7 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <h3 id="delete-account-title" className="font-display text-lg text-ink text-center">{t('title')}</h3>
                <p className="text-sm text-ink-soft text-center">{t('warning')}</p>
              </div>

              <div className="space-y-3">
                {usesChallenge ? (
                  <div>
                    <label htmlFor="delete-cred" className="block text-[12px] font-medium uppercase tracking-wider text-ink/65 mb-1.5">
                      {t('tgCodeLabel')}
                    </label>
                    {!challengeSent ? (
                      <button
                        type="button"
                        onClick={handleRequestChallenge}
                        disabled={requesting}
                        className="w-full rounded-full border border-ink/25 bg-transparent px-4 py-3 text-sm font-medium uppercase tracking-wider text-ink/85 transition-all duration-200 hover:bg-ink/5 disabled:opacity-50"
                      >
                        {requesting ? t('tgChallengeRequesting') : t('tgChallengeButton')}
                      </button>
                    ) : (
                      <>
                        <input
                          id="delete-cred"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          value={credential}
                          onChange={(e) => setCredential(e.target.value.replace(/\D/g, ''))}
                          className="admin-input tracking-[0.2em]"
                          placeholder={t('tgCodePlaceholder')}
                          required
                          disabled={submitting}
                        />
                        <p className="mt-1 text-[12px] text-ink/55">{t('tgChallengeSent')}</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div>
                    <label htmlFor="delete-cred" className="block text-[12px] font-medium uppercase tracking-wider text-ink/65 mb-1.5">
                      {t('passwordLabel')}
                    </label>
                    <input
                      id="delete-cred"
                      type="password"
                      autoComplete="current-password"
                      value={credential}
                      onChange={(e) => setCredential(e.target.value)}
                      className="admin-input"
                      placeholder={t('passwordPlaceholder')}
                      required
                      disabled={submitting}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="delete-confirm" className="block text-[12px] font-medium uppercase tracking-wider text-ink/65 mb-1.5">
                    {t('confirmationLabel')}
                  </label>
                  <input
                    id="delete-confirm"
                    type="text"
                    autoComplete="off"
                    autoCapitalize="characters"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="admin-input tracking-[0.2em]"
                    placeholder="DELETE"
                    required
                    disabled={submitting}
                  />
                  <p className="mt-1 text-[12px] text-ink/55">{t('confirmationHint')}</p>
                </div>
              </div>

              {error && <p role="alert" className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 rounded-full border border-ink/20 bg-transparent px-4 py-3 text-sm font-medium uppercase tracking-wider text-ink/70 transition-all duration-200 hover:bg-ink/5 hover:border-ink/30 disabled:opacity-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="relative flex-1 overflow-hidden rounded-full bg-red-500/90 px-4 py-3 text-sm font-medium uppercase tracking-wider text-white transition-all duration-200 hover:bg-red-500 disabled:opacity-50"
                >
                  <span className={`inline-block transition-opacity duration-200 ${submitting ? 'opacity-0' : 'opacity-100'}`}>
                    {t('confirmDelete')}
                  </span>
                  {submitting && <span className="absolute inset-0 flex items-center justify-center"><BrandLoader size={18} /></span>}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

'use client';

import Link from 'next/link';
import type {ReactNode} from 'react';

type ErrorVariant = 'default' | 'warn' | 'private' | 'offline' | 'maintenance';
type Tilt = 'left' | 'right' | 'slight';

export interface ErrorTagMeta {
  label: string;
  value: string;
  italic?: boolean;
}

export interface ErrorTagAction {
  label: string;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
}

export interface ErrorTagProps {
  variant?: ErrorVariant;
  tilt?: Tilt;
  topLabel?: string;
  badge?: {label: string; tone?: 'warn' | 'info'};
  sealed?: boolean;
  code: string;
  title: string;
  description: ReactNode;
  meta?: ErrorTagMeta[];
  actions: ErrorTagAction[];
  progress?: {
    label: string;
    percentLabel: string;
    percent: number;
  };
  steps?: Array<{label: string; state: 'done' | 'now' | 'pending'}>;
  signal?: boolean;
  subscribeForm?: {
    placeholder: string;
    submitLabel: string;
    submittedLabel: string;
    onSubmit?: (email: string) => void | Promise<void>;
  };
}

function tiltClass(t: Tilt | undefined) {
  if (t === 'right') return 'rotate-[2deg]';
  if (t === 'slight') return 'rotate-[-1deg]';
  return 'rotate-[-2deg]';
}

function variantBg(v: ErrorVariant | undefined) {
  switch (v) {
    case 'warn':
      return 'error-bg-warn';
    case 'private':
      return 'error-bg-private';
    case 'offline':
      return 'error-bg-offline';
    case 'maintenance':
      return 'error-bg-mnt';
    default:
      return 'error-bg-default';
  }
}

export default function ErrorTag(props: ErrorTagProps) {
  const {
    variant = 'default',
    tilt = 'left',
    topLabel,
    badge,
    sealed = false,
    code,
    title,
    description,
    meta,
    actions,
    progress,
    steps,
    signal,
    subscribeForm,
  } = props;

  return (
    <div className="error-stage">
      <div className={`error-tag-wrap ${variantBg(variant)}`}>
        <div className={`error-tag ${tiltClass(tilt)} ${sealed ? 'error-tag-sealed' : ''}`}>
          {sealed ? (
            <div className="error-seal">
              <img src="/logos/icon-white.svg" alt="" aria-hidden="true" />
            </div>
          ) : null}

          {topLabel ? <div className="error-top">— {topLabel} —</div> : null}

          {badge ? (
            <div className={`error-badge ${badge.tone === 'info' ? 'info' : 'warn'}`}>
              <span className="error-badge-dot" />
              {badge.label}
            </div>
          ) : null}

          {signal ? (
            <div className="error-signal" aria-hidden="true">
              <span className="error-signal-wave error-signal-w3" />
              <span className="error-signal-wave error-signal-w2" />
              <span className="error-signal-wave error-signal-w1" />
              <span className="error-signal-dot" />
              <span className="error-signal-strike" />
            </div>
          ) : !sealed && !badge ? (
            <div className="error-mark">
              <img src="/logos/icon-white.svg" alt="" aria-hidden="true" draggable={false} />
            </div>
          ) : null}

          <div className="error-num">{code}</div>
          <div className="error-title">{title}</div>
          <div className="error-divider" />

          <div className="error-desc">{description}</div>

          {progress ? (
            <div className="error-progress">
              <div className="error-progress-top">
                <span>{progress.label}</span>
                <span>{progress.percentLabel}</span>
              </div>
              <div className="error-progress-bar">
                <span style={{width: `${Math.max(0, Math.min(100, progress.percent))}%`}} />
              </div>
            </div>
          ) : null}

          {meta && meta.length > 0 ? (
            <div className="error-meta">
              {meta.map((m, i) => (
                <div key={i}>
                  <div className="error-meta-k">{m.label}</div>
                  <div className={`error-meta-v ${m.italic ? 'italic' : ''}`}>{m.value}</div>
                </div>
              ))}
            </div>
          ) : null}

          {steps && steps.length > 0 ? (
            <ul className="error-steps">
              {steps.map((s, i) => (
                <li key={i} className={s.state}>
                  <span>{s.label}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {subscribeForm ? <SubscribeForm {...subscribeForm} /> : null}

          <div className="error-actions">
            {actions.map((a, i) =>
              a.href ? (
                <Link
                  key={i}
                  href={a.href}
                  className={a.primary ? 'error-btn-gold' : 'error-btn-ghost'}
                >
                  {a.label}
                </Link>
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={a.onClick}
                  className={a.primary ? 'error-btn-gold' : 'error-btn-ghost'}
                >
                  {a.label}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SubscribeForm({
  placeholder,
  submitLabel,
  submittedLabel,
  onSubmit,
}: NonNullable<ErrorTagProps['subscribeForm']>) {
  return (
    <form
      className="error-form"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const input = form.querySelector('input[type="email"]') as HTMLInputElement | null;
        const button = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
        if (input && button) {
          const email = input.value.trim();
          if (email) {
            onSubmit?.(email);
            button.textContent = submittedLabel;
            button.disabled = true;
            input.disabled = true;
          }
        }
      }}
    >
      <input type="email" required placeholder={placeholder} />
      <button type="submit">{submitLabel}</button>
    </form>
  );
}

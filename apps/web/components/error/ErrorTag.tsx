'use client';

import Link from 'next/link';
import type {ReactNode} from 'react';

type ErrorVariant = 'default' | 'warn' | 'private' | 'offline';

export interface ErrorTagAction {
  label: string;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
  icon?: 'home' | 'shop' | 'login' | 'mail' | 'retry' | 'back';
}

export interface ErrorTagProps {
  variant?: ErrorVariant;
  code: string;
  title: string;
  description: ReactNode;
  actions: ErrorTagAction[];
  signal?: boolean;
}

const ICONS: Record<NonNullable<ErrorTagAction['icon']>, ReactNode> = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  shop: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
  login: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  retry: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  ),
  back: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  ),
};

function WifiOff() {
  return (
    <svg
      className="err2-signal-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h.01" />
      <path d="M8.5 16.429a5 5 0 0 1 7 0" />
      <path d="M5 12.859a10 10 0 0 1 5.17-2.69" />
      <path d="M19 12.859a10 10 0 0 0-2.007-1.523" />
      <path d="M2 8.82a15 15 0 0 1 4.177-2.643" />
      <path d="M22 8.82a15 15 0 0 0-11.288-3.764" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

export default function ErrorTag({variant = 'default', code, title, description, actions, signal}: ErrorTagProps) {
  return (
    <div className={`err2 err2-${variant}`}>
      <div className="err2-glow" aria-hidden="true" />

      <div className="err2-inner">
        {signal ? <WifiOff /> : null}

        <h1 className="sr-only">{title}</h1>
        <div className="err2-code" aria-hidden="true">{code}</div>
        <p className="err2-desc">{description}</p>

        <div className="err2-actions">
          {actions.map((a, i) => {
            const inner = (
              <>
                {a.icon ? <span className="err2-btn-ic" aria-hidden="true">{ICONS[a.icon]}</span> : null}
                {a.label}
              </>
            );
            return a.href ? (
              <Link
                key={i}
                href={a.href}
                className={a.primary ? 'err2-btn-primary' : 'err2-btn-ghost'}
              >
                {inner}
              </Link>
            ) : (
              <button
                key={i}
                type="button"
                onClick={a.onClick}
                className={a.primary ? 'err2-btn-primary' : 'err2-btn-ghost'}
              >
                {inner}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

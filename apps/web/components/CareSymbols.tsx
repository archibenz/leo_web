'use client';

import type {ReactNode} from 'react';

const SYMBOLS: Record<string, { icon: ReactNode; label: { en: string; ru: string } }> = {
  wash_30: {
    icon: (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8h28v24a2 2 0 01-2 2H8a2 2 0 01-2-2V8z" />
        <path d="M6 8c0 4 6.5 8 14 8s14-4 14-8" />
        <text x="20" y="28" textAnchor="middle" fontSize="9" fill="currentColor" stroke="none" fontFamily="sans-serif">30°</text>
      </svg>
    ),
    label: { en: 'Wash at 30°C', ru: 'Стирка при 30°C' },
  },
  wash_40: {
    icon: (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8h28v24a2 2 0 01-2 2H8a2 2 0 01-2-2V8z" />
        <path d="M6 8c0 4 6.5 8 14 8s14-4 14-8" />
        <text x="20" y="28" textAnchor="middle" fontSize="9" fill="currentColor" stroke="none" fontFamily="sans-serif">40°</text>
      </svg>
    ),
    label: { en: 'Wash at 40°C', ru: 'Стирка при 40°C' },
  },
  hand_wash: {
    icon: (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8h28v24a2 2 0 01-2 2H8a2 2 0 01-2-2V8z" />
        <path d="M6 8c0 4 6.5 8 14 8s14-4 14-8" />
        <path d="M16 22c0-2 2-4 4-4s4 2 4 4" />
        <path d="M20 18v-4" />
      </svg>
    ),
    label: { en: 'Hand wash', ru: 'Ручная стирка' },
  },
  no_wash: {
    icon: (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8h28v24a2 2 0 01-2 2H8a2 2 0 01-2-2V8z" />
        <path d="M6 8c0 4 6.5 8 14 8s14-4 14-8" />
        <line x1="8" y1="6" x2="32" y2="34" strokeWidth="2" />
      </svg>
    ),
    label: { en: 'Do not wash', ru: 'Не стирать' },
  },
  no_bleach: {
    icon: (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="20,6 34,34 6,34" />
        <line x1="8" y1="6" x2="32" y2="34" strokeWidth="2" />
      </svg>
    ),
    label: { en: 'Do not bleach', ru: 'Не отбеливать' },
  },
  iron_low: {
    icon: (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 28h22l4-8H16l-8 0z" />
        <path d="M16 20V10h6" />
        <circle cx="22" cy="25" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    ),
    label: { en: 'Iron low heat', ru: 'Утюг: низкая температура' },
  },
  iron_medium: {
    icon: (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 28h22l4-8H16l-8 0z" />
        <path d="M16 20V10h6" />
        <circle cx="20" cy="25" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="24" cy="25" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    ),
    label: { en: 'Iron medium heat', ru: 'Утюг: средняя температура' },
  },
  no_iron: {
    icon: (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 28h22l4-8H16l-8 0z" />
        <path d="M16 20V10h6" />
        <line x1="8" y1="6" x2="32" y2="34" strokeWidth="2" />
      </svg>
    ),
    label: { en: 'Do not iron', ru: 'Не гладить' },
  },
  tumble_dry: {
    icon: (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="6" width="28" height="28" rx="2" />
        <circle cx="20" cy="20" r="9" />
      </svg>
    ),
    label: { en: 'Tumble dry', ru: 'Сушка в машине' },
  },
  no_tumble_dry: {
    icon: (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="6" width="28" height="28" rx="2" />
        <circle cx="20" cy="20" r="9" />
        <line x1="8" y1="6" x2="32" y2="34" strokeWidth="2" />
      </svg>
    ),
    label: { en: 'Do not tumble dry', ru: 'Не сушить в машине' },
  },
  dry_flat: {
    icon: (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="6" width="28" height="28" rx="2" />
        <line x1="12" y1="20" x2="28" y2="20" />
      </svg>
    ),
    label: { en: 'Dry flat', ru: 'Сушить горизонтально' },
  },
  dry_shade: {
    icon: (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="6" width="28" height="28" rx="2" />
        <line x1="12" y1="12" x2="28" y2="12" />
        <line x1="12" y1="16" x2="28" y2="16" />
      </svg>
    ),
    label: { en: 'Dry in shade', ru: 'Сушить в тени' },
  },
  dry_clean: {
    icon: (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="20" cy="20" r="14" />
        <text x="20" y="24" textAnchor="middle" fontSize="13" fill="currentColor" stroke="none" fontFamily="serif">P</text>
      </svg>
    ),
    label: { en: 'Dry clean', ru: 'Химчистка' },
  },
  no_dry_clean: {
    icon: (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="20" cy="20" r="14" />
        <text x="20" y="24" textAnchor="middle" fontSize="13" fill="currentColor" stroke="none" fontFamily="serif">P</text>
        <line x1="8" y1="6" x2="32" y2="34" strokeWidth="2" />
      </svg>
    ),
    label: { en: 'Do not dry clean', ru: 'Химчистка запрещена' },
  },
  gentle_cycle: {
    icon: (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8h28v24a2 2 0 01-2 2H8a2 2 0 01-2-2V8z" />
        <path d="M6 8c0 4 6.5 8 14 8s14-4 14-8" />
        <line x1="6" y1="36" x2="34" y2="36" />
      </svg>
    ),
    label: { en: 'Gentle cycle', ru: 'Деликатная стирка' },
  },
};

export const CARE_SYMBOL_KEYS = Object.keys(SYMBOLS);

interface CareSymbolProps {
  symbolKey: string;
  locale?: string;
  size?: number;
  showLabel?: boolean;
}

export function CareSymbol({ symbolKey, locale = 'ru', size = 32, showLabel = false }: CareSymbolProps) {
  const sym = SYMBOLS[symbolKey];
  if (!sym) return null;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-ink/60" style={{ width: size, height: size }}>
        {sym.icon}
      </div>
      {showLabel && (
        <span className="text-[10px] text-ink/40 text-center leading-tight max-w-[80px]">
          {locale === 'ru' ? sym.label.ru : sym.label.en}
        </span>
      )}
    </div>
  );
}

interface CareSymbolsRowProps {
  symbols: string[];
  locale?: string;
  size?: number;
  showLabels?: boolean;
}

export function CareSymbolsRow({ symbols, locale = 'ru', size = 32, showLabels = false }: CareSymbolsRowProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {symbols.map((key) => (
        <CareSymbol key={key} symbolKey={key} locale={locale} size={size} showLabel={showLabels} />
      ))}
    </div>
  );
}

export function getSymbolLabel(key: string, locale: string): string {
  return SYMBOLS[key]?.label[locale === 'ru' ? 'ru' : 'en'] ?? key;
}

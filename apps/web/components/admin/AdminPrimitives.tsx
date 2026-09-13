'use client';

import Link from 'next/link';
import type {AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode} from 'react';
import {HAIR, INK, MUTED, SIGNAL} from '../../app/[locale]/wv-palette';

// Примитивы админской оболочки в языке витрины — карточка, заголовок,
// показатель, кнопка, пункт навигации. Тот же приём, что
// components/editor/EditorFields.tsx: волосяная линия вместо карточки с
// градиентной темы, прямые углы, палитра wv-palette через inline style, а
// не CSS-переменные старой темы (см. task-admin-white-brief.md, приёмка п.1
// — их дословные имена этот файл нарочно не воспроизводит: тест на палитру
// ищет их простым grep по исходникам, и упомянуть их в комментарии значило
// бы дать самому себе ложный красный).
//
// «Поле» из брифа («карточка, навигация, поле, кнопка, заголовок,
// показатель») сюда не вошло: у дашборда и оболочки в этой ветке нет ни
// одной формы — добавлять неиспользуемый примитив значило бы тащить мёртвый
// код. Поле понадобится веткам ProductForm/CollectionForm/CareGuideForm и
// заводится там, рядом с первым потребителем.

export function AdminHeading({children, as = 'h1'}: {children: ReactNode; as?: 'h1' | 'h2'}) {
  const Tag = as;
  const size = as === 'h1' ? 'text-2xl sm:text-3xl' : 'text-lg';
  return (
    <Tag className={`font-display ${size}`} style={{color: INK}}>
      {children}
    </Tag>
  );
}

export function AdminSectionLabel({children}: {children: ReactNode}) {
  return (
    <p className="text-[11px] uppercase tracking-[0.16em]" style={{color: MUTED}}>
      {children}
    </p>
  );
}

export function AdminCard({children, className = ''}: {children: ReactNode; className?: string}) {
  return (
    <div className={`border p-4 sm:p-5 ${className}`} style={{borderColor: HAIR}}>
      {children}
    </div>
  );
}

type AdminStatProps = {
  label: string;
  value: ReactNode;
  tone?: 'default' | 'warn';
  delta?: string;
  // Когда считать нечего (см. task-admin-white-brief.md, «Нули не выглядят
  // поломкой»), value несёт текст причины вместо числа — и рисуется мельче,
  // не Cormorant-цифрой, чтобы «ноль» и «данных нет» не читались одинаково.
  empty?: boolean;
};

export function AdminStat({label, value, tone = 'default', delta, empty}: AdminStatProps) {
  return (
    <AdminCard className="text-left">
      {empty ? (
        <p className="text-[13px] leading-snug" style={{color: MUTED}}>{value}</p>
      ) : (
        <p className="font-display text-2xl sm:text-3xl" style={{color: tone === 'warn' ? SIGNAL : INK}}>
          {value}
        </p>
      )}
      <p className="mt-1.5 text-[11px] uppercase tracking-[0.14em]" style={{color: MUTED}}>{label}</p>
      {delta && !empty && (
        <p className="mt-1 text-[12px]" style={{color: INK}}>{delta}</p>
      )}
    </AdminCard>
  );
}

type AdminButtonOwnProps = {
  children: ReactNode;
  tone?: 'solid' | 'plain';
};

type AdminButtonAsButton = AdminButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style' | 'color'> & {href?: undefined};

type AdminButtonAsLink = AdminButtonOwnProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'style' | 'color'> & {href: string};

// min-h-11 — 44px, зона нажатия от брифа. text-[13px] — кегль-пол оттуда же
// (см. task-admin-white-brief.md, «Мобильная раскладка»).
const BUTTON_BASE =
  'inline-flex min-h-11 items-center justify-center px-4 text-[13px] uppercase tracking-[0.1em] transition-colors disabled:opacity-45';

function buttonStyle(tone: 'solid' | 'plain') {
  return tone === 'solid'
    ? {background: INK, color: '#fff', border: `1px solid ${INK}`}
    : {background: 'transparent', color: INK, border: `1px solid ${INK}`};
}

export function AdminButton(props: AdminButtonAsButton | AdminButtonAsLink) {
  const {children, tone = 'plain', ...rest} = props;
  const style = buttonStyle(tone);
  if ('href' in rest && rest.href) {
    const {href, ...anchorRest} = rest as AdminButtonAsLink;
    return (
      <Link href={href} className={BUTTON_BASE} style={style} {...anchorRest}>
        {children}
      </Link>
    );
  }
  const buttonRest = rest as Omit<AdminButtonAsButton, 'children' | 'tone' | 'href'>;
  return (
    <button type="button" className={BUTTON_BASE} style={style} {...buttonRest}>
      {children}
    </button>
  );
}

export function AdminNavLink({href, label, icon, active}: {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className="flex min-h-11 items-center gap-3 px-3 text-[13px] transition-colors"
      style={{
        color: active ? INK : MUTED,
        borderLeft: `2px solid ${active ? INK : 'transparent'}`,
        background: active ? 'rgba(28,23,20,0.04)' : 'transparent',
      }}
    >
      {icon}
      <span className="uppercase tracking-[0.06em]">{label}</span>
    </Link>
  );
}

// Тег статуса заказа — вместо разноцветных Tailwind-пилюль (yellow/blue/
// purple/green), которых нет в wv-palette. SIGNAL только для отменённых —
// он же сигнал «плохо» на витрине (см. wv-palette.ts).
export function AdminTag({children, tone = 'neutral'}: {children: ReactNode; tone?: 'neutral' | 'negative'}) {
  const color = tone === 'negative' ? SIGNAL : INK;
  return (
    <span
      className="inline-block border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em]"
      style={{borderColor: tone === 'negative' ? SIGNAL : HAIR, color}}
    >
      {children}
    </span>
  );
}

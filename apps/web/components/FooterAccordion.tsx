'use client';

import {useId, useState, type ReactNode} from 'react';

interface FooterAccordionProps {
  title: string;
  children: ReactNode;
  // Optional: open by default (used for the column most users care about).
  defaultOpen?: boolean;
}

export default function FooterAccordion({
  title,
  children,
  defaultOpen = false,
}: FooterAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  // useId, not a title-derived slug: localized (Cyrillic) titles slugified to
  // the same empty string, so every column shared one id.
  const baseId = useId();
  const triggerId = `footer-accordion-trigger-${baseId}`;
  const panelId = `footer-accordion-panel-${baseId}`;

  return (
    <div className="border-b border-inkSoft/[0.06]">
      <button
        id={triggerId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-3.5"
      >
        <span className="font-accent text-[11px] uppercase tracking-[0.3em] text-accent/65">
          {title}
        </span>
        <svg
          className={`h-3 w-3 text-inkSoft/40 transition-transform duration-300 motion-reduce:transition-none ${
            open ? 'rotate-45' : ''
          }`}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <path d="M6 1v10M1 6h10" strokeLinecap="round" />
        </svg>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        inert={!open}
        className={`accordion-collapse ${open ? 'is-open' : ''}`}
      >
        <div className="pb-4 pt-1">{children}</div>
      </div>
    </div>
  );
}

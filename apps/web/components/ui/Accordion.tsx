'use client';

import {useCallback, useState, type ReactNode} from 'react';

export interface AccordionItem {
  key: string;
  title: ReactNode;
  content: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  defaultOpenKeys?: string[];
  allowMultiple?: boolean;
  className?: string;
}

export default function Accordion({
  items,
  defaultOpenKeys = [],
  allowMultiple = false,
  className,
}: AccordionProps) {
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set(defaultOpenKeys));

  const toggle = useCallback(
    (key: string) => {
      setOpenKeys((prev) => {
        const next = new Set(allowMultiple ? prev : []);
        if (prev.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    },
    [allowMultiple],
  );

  return (
    <div className={`divide-y divide-[var(--ink)]/10 ${className ?? ''}`}>
      {items.map((item) => {
        const isOpen = openKeys.has(item.key);
        const panelId = `accordion-panel-${item.key}`;
        const triggerId = `accordion-trigger-${item.key}`;

        return (
          <div key={item.key}>
            <button
              id={triggerId}
              type="button"
              onClick={() => toggle(item.key)}
              className="flex w-full items-center justify-between py-5 text-left"
              aria-expanded={isOpen}
              aria-controls={panelId}
            >
              <span className="text-base font-medium text-[var(--ink)]">
                {item.title}
              </span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                className={`flex-shrink-0 text-[var(--ink-soft)] transition-transform duration-200 motion-reduce:transition-none ${
                  isOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              inert={!isOpen}
              className={`accordion-collapse ${isOpen ? 'is-open' : ''}`}
            >
              <div className="pb-5 text-sm leading-relaxed text-[var(--ink-soft)]">
                {item.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

'use client';

import {useCallback, useEffect, useState, type ReactNode} from 'react';
import {AnimatePresence, motion} from 'framer-motion';

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

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}

export default function Accordion({
  items,
  defaultOpenKeys = [],
  allowMultiple = false,
  className,
}: AccordionProps) {
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set(defaultOpenKeys));
  const reduced = usePrefersReducedMotion();

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
                className={`flex-shrink-0 text-[var(--ink-soft)] transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  id={panelId}
                  role="region"
                  aria-labelledby={triggerId}
                  initial={reduced ? {height: 'auto', opacity: 1} : {height: 0, opacity: 0}}
                  animate={{height: 'auto', opacity: 1}}
                  exit={reduced ? {height: 'auto', opacity: 1} : {height: 0, opacity: 0}}
                  transition={reduced ? {duration: 0} : {duration: 0.25, ease: [0.22, 0.61, 0.36, 1]}}
                  style={{overflow: 'hidden'}}
                >
                  <div className="pb-5 text-sm leading-relaxed text-[var(--ink-soft)]">
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

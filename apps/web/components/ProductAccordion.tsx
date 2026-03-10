'use client';

import {useState} from 'react';

interface ProductAccordionProps {
  items: {
    title: string;
    content: React.ReactNode;
  }[];
}

export default function ProductAccordion({items}: ProductAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="divide-y divide-[var(--ink)]/10">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i}>
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="flex w-full items-center justify-between py-5 text-left"
              aria-expanded={isOpen}
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
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ease-out ${
                isOpen ? 'max-h-96 pb-5' : 'max-h-0'
              }`}
            >
              <div className="text-sm leading-relaxed text-[var(--ink-soft)]">
                {item.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

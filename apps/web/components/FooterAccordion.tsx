'use client';

import {AnimatePresence, motion} from 'framer-motion';
import {useState, type ReactNode} from 'react';

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

  return (
    <div className="border-b border-[#F2E6D8]/[0.06]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-3.5"
      >
        <span className="font-accent text-[11px] uppercase tracking-[0.3em] text-[#D4A574]/65">
          {title}
        </span>
        <svg
          className={`h-3 w-3 text-[#F2E6D8]/40 transition-transform duration-300 ${
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
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{height: 0, opacity: 0}}
            animate={{height: 'auto', opacity: 1}}
            exit={{height: 0, opacity: 0}}
            transition={{
              height: {duration: 0.32, ease: [0.4, 0, 0.2, 1]},
              opacity: {duration: 0.22, ease: 'easeOut'},
            }}
            className="overflow-hidden"
          >
            <div className="pb-4 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

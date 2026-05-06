'use client';

import {motion, useMotionTemplate} from 'framer-motion';
import {type ReactNode} from 'react';
import {useStackedScroll} from '../../../../hooks/useStackedScroll';

interface FooterSlideProps {
  zIndex: number;
  children: ReactNode;
}

export default function FooterSlide({zIndex, children}: FooterSlideProps) {
  const stack = useStackedScroll<HTMLElement>({shadow: true});
  const boxShadow = useMotionTemplate`0 -22px 44px rgba(0, 0, 0, ${stack.shadowAlpha})`;

  return (
    <section
      ref={stack.ref}
      className="relative w-full"
      style={{
        // No min-height + no sticky inner = footer renders inline at its natural
        // height and the user scrolls through it without the nested-scroll trap
        // that the original sticky+overflow-y-auto pattern produced.
        scrollSnapAlign: 'start',
        // 'normal' (not 'always') so swiping out of the last product slide
        // glides into the footer rather than locking on it.
        scrollSnapStop: 'normal',
      }}
    >
      <motion.div
        className="flex w-full flex-col bg-[#1a0f0a]"
        style={{
          position: 'relative',
          zIndex,
          willChange: 'clip-path',
          clipPath: stack.clipPath,
          boxShadow,
        }}
      >
        {children}
      </motion.div>
    </section>
  );
}
